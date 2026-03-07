import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { PROPOSAL_ERROR_MESSAGES } from '@/lib/constants/messages';
import {
  PROPOSAL_RATE_LIMIT_MAX,
  PROPOSAL_RATE_LIMIT_WINDOW_MS,
  PROPOSAL_REASON_MAX_LENGTH,
  PROPOSAL_SUPPORTED_LANGUAGES,
} from '@/lib/constants';

const reasonField = z.string().max(PROPOSAL_REASON_MAX_LENGTH).optional();

const tagRefFields = {
  existingTagId: z.string().min(1).optional(),
  newTagName: z.string().min(1).optional(),
  language: z.enum(PROPOSAL_SUPPORTED_LANGUAGES).optional(),
  reason: reasonField,
};

const tagRefRefinements = [
  {
    check: (data: { existingTagId?: string; newTagName?: string }) =>
      Boolean(data.existingTagId || data.newTagName),
    message: 'existingTagId or newTagName is required',
  },
  {
    check: (data: { newTagName?: string; language?: string }) =>
      !data.newTagName || Boolean(data.language),
    message: 'language is required when newTagName is provided',
  },
] as const;

const categorySchema = z.object({
  type: z.literal('CATEGORY'),
  categoryId: z.string().min(1),
  reason: reasonField,
});

const translationBaseSchema = z.object({
  type: z.literal('TRANSLATION'),
  ...tagRefFields,
});

const implicationBaseSchema = z.object({
  type: z.literal('IMPLICATION'),
  ...tagRefFields,
});

const translationSchema = translationBaseSchema
  .refine(tagRefRefinements[0].check, { message: tagRefRefinements[0].message })
  .refine(tagRefRefinements[1].check, { message: tagRefRefinements[1].message });

const implicationSchema = implicationBaseSchema
  .refine(tagRefRefinements[0].check, { message: tagRefRefinements[0].message })
  .refine(tagRefRefinements[1].check, { message: tagRefRefinements[1].message });

// discriminatedUnion requires plain z.object (no refinements)
const proposalSchema = z.discriminatedUnion('type', [
  categorySchema,
  translationBaseSchema,
  implicationBaseSchema,
]);

type RouteContext = { params: Promise<{ tagId: string }> };

export async function POST(req: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: PROPOSAL_ERROR_MESSAGES.UNAUTHORIZED },
        { status: 401 }
      );
    }

    if (session.user.status === 'SUSPENDED') {
      return NextResponse.json(
        { error: PROPOSAL_ERROR_MESSAGES.ACCOUNT_SUSPENDED },
        { status: 403 }
      );
    }

    const { tagId } = await context.params;

    const tag = await prisma.tag.findUnique({ where: { id: tagId } });
    if (!tag) {
      return NextResponse.json(
        { error: PROPOSAL_ERROR_MESSAGES.TAG_NOT_FOUND },
        { status: 404 }
      );
    }

    const body = await req.json();

    // Step 1: discriminatedUnion for basic type + field validation
    const baseValidation = proposalSchema.safeParse(body);
    if (!baseValidation.success) {
      return NextResponse.json(
        { error: baseValidation.error.flatten() },
        { status: 400 }
      );
    }

    // Step 2: type-specific refinement validation
    const { type } = baseValidation.data;
    if (type === 'TRANSLATION') {
      const result = translationSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.flatten() },
          { status: 400 }
        );
      }
    } else if (type === 'IMPLICATION') {
      const result = implicationSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.flatten() },
          { status: 400 }
        );
      }
    }

    const validatedData = baseValidation.data;

    // Rate limiting
    const windowStart = new Date(Date.now() - PROPOSAL_RATE_LIMIT_WINDOW_MS);
    const recentCount = await prisma.tagProposal.count({
      where: {
        proposerId: session.user.id,
        createdAt: { gt: windowStart },
      },
    });

    if (recentCount >= PROPOSAL_RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: PROPOSAL_ERROR_MESSAGES.TOO_MANY_PROPOSALS },
        { status: 429 }
      );
    }

    // Build create data based on type
    const createData: Prisma.TagProposalCreateInput = {
      tag: { connect: { id: tagId } },
      proposer: { connect: { id: session.user.id } },
      type,
      reason: validatedData.reason,
    };

    if (validatedData.type === 'CATEGORY') {
      createData.category = { connect: { id: validatedData.categoryId } };
    } else {
      if (validatedData.existingTagId) {
        createData.existingTag = { connect: { id: validatedData.existingTagId } };
      }
      if (validatedData.newTagName) {
        createData.newTagName = validatedData.newTagName;
        createData.language = validatedData.language;
      }
    }

    const proposal = await prisma.tagProposal.create({
      data: createData,
    });

    return NextResponse.json(proposal, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: PROPOSAL_ERROR_MESSAGES.DUPLICATE_PROPOSAL },
        { status: 409 }
      );
    }
    console.error('Error creating tag proposal:', error);
    return NextResponse.json(
      { error: PROPOSAL_ERROR_MESSAGES.INTERNAL_SERVER_ERROR },
      { status: 500 }
    );
  }
}
