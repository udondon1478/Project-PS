// src/app/api/admin/tags/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { isAdmin } from '@/lib/auth'; // isAdminヘルパー関数をインポート

const prisma = new PrismaClient();

export async function GET(request: Request) {
  // 管理者判定
  if (!await isAdmin()) {
    return NextResponse.json({ message: '管理者権限が必要です。' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    // typeパラメータは必須ではないが、指定があればフィルタリング
    const where = type ? { type: type } : {};

    const tags = await prisma.tag.findMany({
      where: where,
      select: {
        id: true,
        name: true,
        type: true, // 管理画面ではtypeも表示
        category: true, // 管理画面ではcategoryも表示
        color: true,
        language: true, // 管理画面ではlanguageも表示
        isAlias: true, // 管理画面ではisAliasも表示
        canonicalId: true, // 管理画面ではcanonicalIdも表示
        description: true, // 管理画面ではdescriptionも表示
        count: true, // 管理画面ではcountも表示
      },
      orderBy: {
        name: 'asc', // 名前順でソート
      }
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ message: 'タグの取得に失敗しました。' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: Request) {
  // 管理者判定
  if (!await isAdmin()) {
    return NextResponse.json({ message: '管理者権限が必要です。' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, type, category, color, language, description, isAlias, canonicalId } = body;

    // 必須フィールドの検証
    if (!name || !type || !category || !color || !language) {
      return NextResponse.json({ message: '必須フィールドが不足しています (name, type, category, color, language)。' }, { status: 400 });
    }

    // canonicalIdが指定されている場合は、そのタグが存在するか確認
    if (isAlias && canonicalId) {
        const canonicalTag = await prisma.tag.findUnique({
            where: { id: canonicalId },
            select: { id: true }
        });
        if (!canonicalTag) {
            return NextResponse.json({ message: '指定された正規タグ (canonicalId) が存在しません。', field: 'canonicalId' }, { status: 400 });
        }
    } else if (isAlias && !canonicalId) {
         return NextResponse.json({ message: 'isAliasがtrueの場合、canonicalIdは必須です。', field: 'canonicalId' }, { status: 400 });
    } else if (!isAlias && canonicalId) {
         return NextResponse.json({ message: 'isAliasがfalseの場合、canonicalIdは指定できません。', field: 'canonicalId' }, { status: 400 });
    }


    const newTag = await prisma.tag.create({
      data: {
        name,
        type,
        category,
        color,
        language,
        description,
        isAlias: isAlias || false, // デフォルトはfalse
        canonicalId: isAlias ? canonicalId : null, // isAliasがtrueの場合のみ設定
      },
    });

    return NextResponse.json(newTag, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
     // Prismaエラーの可能性を考慮
    if (error instanceof Error && error.message.includes('Unique constraint failed')) {
         return NextResponse.json({ message: '指定されたタグ名は既に存在します。', field: 'name' }, { status: 409 });
    }
    return NextResponse.json({ message: 'タグの作成に失敗しました。', error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(request: Request) {
  // 管理者判定
  if (!await isAdmin()) {
    return NextResponse.json({ message: '管理者権限が必要です。' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, name, type, category, color, language, description, isAlias, canonicalId } = body;

    // idは必須
    if (!id) {
      return NextResponse.json({ message: '更新対象のタグID (id) が必要です。', field: 'id' }, { status: 400 });
    }

    // canonicalIdが指定されている場合は、そのタグが存在するか確認
    if (isAlias && canonicalId) {
        const canonicalTag = await prisma.tag.findUnique({
            where: { id: canonicalId },
            select: { id: true }
        });
        if (!canonicalTag) {
            return NextResponse.json({ message: '指定された正規タグ (canonicalId) が存在しません。', field: 'canonicalId' }, { status: 400 });
        }
    } else if (isAlias && !canonicalId) {
         return NextResponse.json({ message: 'isAliasがtrueの場合、canonicalIdは必須です。', field: 'canonicalId' }, { status: 400 });
    } else if (!isAlias && canonicalId) {
         return NextResponse.json({ message: 'isAliasがfalseの場合、canonicalIdは指定できません。', field: 'canonicalId' }, { status: 400 });
    }


    const updatedTag = await prisma.tag.update({
      where: { id: id },
      data: {
        name,
        type,
        category,
        color,
        language,
        description,
        isAlias: isAlias ?? undefined, // undefinedの場合は更新しない
        canonicalId: isAlias ? canonicalId : null, // isAliasがtrueの場合のみ設定、falseならnull
      },
    });

    return NextResponse.json(updatedTag);
  } catch (error) {
    console.error('Error updating tag:', error);
     // Prismaエラーの可能性を考慮
    if (error instanceof Error && error.message.includes('Unique constraint failed')) {
         return NextResponse.json({ message: '指定されたタグ名は既に存在します。', field: 'name' }, { status: 409 });
    }
     if (error instanceof Error && error.message.includes('Record to update not found')) {
         return NextResponse.json({ message: '指定されたタグIDが見つかりません。', field: 'id' }, { status: 404 });
    }
    return NextResponse.json({ message: 'タグの更新に失敗しました。', error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(request: Request) {
  // 管理者判定
  if (!await isAdmin()) {
    return NextResponse.json({ message: '管理者権限が必要です。' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id } = body;

    // idは必須
    if (!id) {
      return NextResponse.json({ message: '削除対象のタグID (id) が必要です。', field: 'id' }, { status: 400 });
    }

    // タグを削除
    const deletedTag = await prisma.tag.delete({
      where: { id: id },
    });

    return NextResponse.json(deletedTag);
  } catch (error) {
    console.error('Error deleting tag:', error);
     // Prismaエラーの可能性を考慮
     if (error instanceof Error && error.message.includes('Record to delete not found')) {
         return NextResponse.json({ message: '指定されたタグIDが見つかりません。', field: 'id' }, { status: 404 });
    }
    return NextResponse.json({ message: 'タグの削除に失敗しました。', error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// TODO: DELETE メソッドを追加

// TODO: PUT, DELETE メソッドを追加