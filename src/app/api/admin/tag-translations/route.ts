import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';

export async function POST(request: Request) {
  if (!await isAdmin()) {
    return NextResponse.json({ message: '管理者権限が必要です。' }, { status: 403 });
  }

  try {
    const { sourceTagId, translatedTagId } = await request.json();

    if (!sourceTagId || !translatedTagId) {
       return NextResponse.json({ message: 'sourceTagId と translatedTagId は必須です。' }, { status: 400 });
    }

    // 同じ言語同士の翻訳を防止
    const [sourceTag, translatedTag] = await Promise.all([
      prisma.tag.findUnique({ where: { id: sourceTagId } }),
      prisma.tag.findUnique({ where: { id: translatedTagId } })
    ]);
    
    if (!sourceTag || !translatedTag) {
        return NextResponse.json({ message: '指定されたタグが見つかりません。' }, { status: 404 });
    }

    if (sourceTag.language === translatedTag.language) {
      return NextResponse.json(
        { message: '同じ言語のタグ同士は翻訳関係にできません' },
        { status: 400 }
      );
    }
    
    const translation = await prisma.tagTranslation.create({
      data: { sourceTagId, translatedTagId }
    });
    
    return NextResponse.json(translation, { status: 201 });
  } catch (error) {
    console.error('Error creating translation:', error);
    if (error instanceof Error && error.message.includes('Unique constraint failed')) {
         return NextResponse.json({ message: 'この翻訳関係は既に存在します。' }, { status: 409 });
    }
    return NextResponse.json({ message: '翻訳関係の作成に失敗しました。' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
    if (!await isAdmin()) {
      return NextResponse.json({ message: '管理者権限が必要です。' }, { status: 403 });
    }

    try {
        const { id, sourceTagId, translatedTagId } = await request.json();
        
        // ID指定で削除、またはペア指定で削除
        if (id) {
            await prisma.tagTranslation.delete({ where: { id } });
        } else if (sourceTagId && translatedTagId) {
            await prisma.tagTranslation.delete({
                where: {
                    sourceTagId_translatedTagId: {
                        sourceTagId,
                        translatedTagId
                    }
                }
            });
        } else {
            return NextResponse.json({ message: 'id または sourceTagId/translatedTagId のペアが必要です。' }, { status: 400 });
        }

        return NextResponse.json({ message: '翻訳関係を削除しました。' });
    } catch (error) {
        console.error('Error deleting translation:', error);
        return NextResponse.json({ message: '翻訳関係の削除に失敗しました。' }, { status: 500 });
    }
}
