import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/session';
import { Role, UserStatus } from '@prisma/client';
import { z } from 'zod';

export async function GET(req: Request) {
  try {
    const session = await getCurrentUser();
    if (session?.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
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
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
    }
    
    const { page, limit, name, email, role, status, isSuspicious } = parsed.data;

    const where: Prisma.UserWhereInput = {};
    if (name) {
      where.name = { contains: name, mode: Prisma.QueryMode.insensitive };
    }
    if (email) {
      where.email = { contains: email, mode: Prisma.QueryMode.insensitive };
    }
    if (role) {
      where.role = role;
    }
    if (status) {
      where.status = status;
    }
    if (isSuspicious) {
      where.isSuspicious = isSuspicious === 'true';
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
        suspicionReason: true,
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
