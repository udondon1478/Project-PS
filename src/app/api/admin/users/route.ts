import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { Role } from '@prisma/client';
import { Role, UserStatus } from '@prisma/client';
import { z } from 'zod';

export async function GET(req: Request) {
  try {
    const session = await getCurrentUser();
    if (session?.role !== Role.ADMIN) {
      return new NextResponse(null, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const querySchema = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      name: z.string().optional(),
      email: z.string().optional(),
      role: z.nativeEnum(Role).optional(),
      status: z.nativeEnum(UserStatus).optional(),
      isSuspicious: z.enum(['true', 'false']).optional(),
    }).strict();
    
    const parsed = querySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      name: searchParams.get('name'),
      email: searchParams.get('email'),
      role: searchParams.get('role'),
      status: searchParams.get('status'),
      isSuspicious: searchParams.get('isSuspicious'),
    });
    
    if (!parsed.success) {
      return new NextResponse('Invalid query parameters', { status: 400 });
    }
    
    const { page, limit, name, email, role, status, isSuspicious } = parsed.data;

    type WhereClause = {
      name?: { contains: string; mode: 'insensitive' };
      email?: { contains: string; mode: 'insensitive' };
      role?: Role;
      status?: UserStatus;
      isSuspicious?: boolean;
    };
    const where: WhereClause = {};
    if (name) {
      where.name = { contains: name, mode: 'insensitive' };
    }
    if (email) {
      where.email = { contains: email, mode: 'insensitive' };
    }
    if (role) {
      where.role = role;
    }
    if (status) {
      where.status = status;
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
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { 
          details: error instanceof Error ? error.message : String(error) 
        })
      },
      { status: 500 }
    );
  }
}
