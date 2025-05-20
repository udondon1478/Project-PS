// src/app/api/admin/tag-categories/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { name, color } = await request.json();

    if (!name || !color) {
      return NextResponse.json({ message: 'Name and color are required' }, { status: 400 });
    }

    const newTagCategory = await prisma.tagCategory.create({
      data: {
        name,
        color,
      },
    });

    return NextResponse.json(newTagCategory, { status: 201 });
  } catch (error) {
    console.error('Error creating tag category:', error);
    return NextResponse.json({ message: 'Failed to create tag category' }, { status: 500 });
  }
}

// 必要に応じてGETメソッドなどを追加することも検討できますが、今回はPOSTのみ実装します。