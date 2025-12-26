
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: 登録済みターゲットタグ一覧取得
export async function GET() {
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
  try {
    const { tag } = await req.json();
    
    if (!tag || typeof tag !== 'string') {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }

    const newTag = await prisma.scraperTargetTag.create({
      data: { tag }
    });

    return NextResponse.json(newTag);
  } catch (error) {
    // ユニーク制約違反などのエラーハンドリング
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}
