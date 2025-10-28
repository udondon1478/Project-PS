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

    const users = suspiciousUsers
      .filter(u => u.isSuspicious)
      .map(u => ({
        id: u.id,
        name: u.name ?? null,
        email: u.email ?? null,        // 必要なら保持。不要なら削除可
        role: u.role,
        status: u.status,
        isSuspicious: u.isSuspicious,
        suspicionReason: u.suspicionReason ?? null,
      }));

    return NextResponse.json({
      message: `Detection complete. Found ${users.length} suspicious users.`,
      users,
      count: users.length,
    });
  } catch (error) {
    console.error('Failed to run suspicious user detection:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
