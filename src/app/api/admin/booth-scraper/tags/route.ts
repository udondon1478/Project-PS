
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from "@/auth";
import { Role, Prisma } from "@prisma/client";

// GET: 登録済みターゲットタグ一覧取得
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const tags = await prisma.scraperTargetTag.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(tags);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

// POST: 新しいターゲットタグの登録
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { tag, category } = await req.json();
    
    if (!tag || typeof tag !== 'string') {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }

    // Validate category if provided
    let validatedCategory: string | null = null;
    if (category !== undefined && category !== null) {
      if (typeof category !== 'string') {
        return NextResponse.json({ error: 'Category must be a string or null' }, { status: 400 });
      }
      const trimmedCategory = category.trim();
      if (trimmedCategory.length > 50) {
        return NextResponse.json({ error: 'Category must be 50 characters or less' }, { status: 400 });
      }
      // Only allow safe characters: alphanumeric, spaces, underscores, hyphens, and unicode letters
      if (trimmedCategory && !/^[\p{L}\p{N}\s_-]+$/u.test(trimmedCategory)) {
        return NextResponse.json({ error: 'Category contains invalid characters' }, { status: 400 });
      }
      validatedCategory = trimmedCategory || null;
    }

    const newTag = await prisma.scraperTargetTag.create({
      data: { 
        tag: tag.trim(),
        category: validatedCategory,
      }
    });

    return NextResponse.json(newTag);
  } catch (error) {
    // ユニーク制約違反などのエラーハンドリング
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return NextResponse.json({ error: 'Tag already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}
