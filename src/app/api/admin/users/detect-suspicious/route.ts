import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { Role } from '@prisma/client';
import { detectSuspiciousUsers } from '@/lib/suspiciousUserDetector';

export async function POST() {
  try {
    const session = await getCurrentUser();
    if (session?.role !== Role.ADMIN) {
      return new NextResponse(null, { status: 403 });
    }

    const suspiciousUsers = await detectSuspiciousUsers();

    return NextResponse.json({
      message: `Detection complete. Found ${suspiciousUsers.filter(u => u.isSuspicious).length} suspicious users.`,
      suspiciousUsers,
    });
  } catch (error) {
    console.error('Failed to run suspicious user detection:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
