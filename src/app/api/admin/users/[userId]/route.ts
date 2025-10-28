import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { Role, UserStatus } from '@prisma/client';
import { z } from 'zod';

const updateUserSchema = z.object({
  role: z.nativeEnum(Role).optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

export async function PUT(req: Request, { params }: { params: { userId: string } }) {
  try {
    const session = await getCurrentUser();
    if (session?.role !== Role.ADMIN) {
      return new NextResponse(null, { status: 403 });
    }

    const { userId } = params;
    const body = await req.json();

    const { success, data } = updateUserSchema.safeParse(body);
    if (!success) {
      return new NextResponse('Invalid request body', { status: 400 });
    }

    const userToUpdate = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userToUpdate) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Prevent admin from accidentally locking themselves out
    if (userToUpdate.id === session.id && (data.role !== Role.ADMIN || data.status !== 'ACTIVE')) {
      return new NextResponse('Admins cannot change their own role or status.', { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Failed to update user:', error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 422 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
