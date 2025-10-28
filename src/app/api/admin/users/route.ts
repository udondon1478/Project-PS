import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { Role } from '@prisma/client';

export async function GET(req: Request) {
  try {
    const session = await getCurrentUser();
    if (session?.role !== Role.ADMIN) {
      return new NextResponse(null, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const name = searchParams.get('name');
    const email = searchParams.get('email');
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const isSuspicious = searchParams.get('isSuspicious');

    const where: any = {};
    if (name) {
      where.name = { contains: name, mode: 'insensitive' };
    }
    if (email) {
      where.email = { contains: email, mode: 'insensitive' };
    }
    if (role) {
      where.role = { equals: role };
    }
    if (status) {
      where.status = { equals: status };
    }
    if (isSuspicious) {
      where.isSuspicious = { equals: isSuspicious === 'true' };
    }

    const users = await prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        isSuspicious: true,
        createdAt: true,
        sessions: {
          select: {
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    const totalUsers = await prisma.user.count({ where });

    return NextResponse.json({
      users,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
