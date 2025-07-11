// src/app/api/admin/tags/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
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
    const limit = parseInt(searchParams.get('limit') || '20', 10); // デフォルト20
    const offset = parseInt(searchParams.get('offset') || '0', 10); // デフォルト0

    // typeパラメータは必須ではないが、指定があればフィルタリング
    const where: Prisma.TagWhereInput = type ? {
      tagCategory: {
        name: type,
      },
    } : {};

    // タグのリストを取得 (ページネーション適用)
    const tags = await prisma.tag.findMany({
      where: where,
      select: {
        id: true,
        name: true,
        language: true, // 管理画面ではlanguageも表示
        isAlias: true, // 管理画面ではisAliasも表示
        canonicalId: true, // 管理画面ではcanonicalIdも表示
        description: true, // 管理画面ではdescriptionも表示
        count: true, // 管理画面ではcountも表示
        tagCategory: { // TagCategory モデルを関連付けて取得
          select: {
            id: true, // カテゴリIDも必要であれば取得
            name: true, // カテゴリ名
            color: true, // カテゴリの色
          },
        },
      },
      orderBy: {
        name: 'asc', // 名前順でソート
      },
      take: limit, // 取得するレコード数
      skip: offset, // スキップするレコード数
    });

    // 条件に一致するタグの総数を取得
    const totalTags = await prisma.tag.count({
      where: where,
    });

    // タグのリストと総数をレスポンスとして返す
    return NextResponse.json({ tags, totalTags });
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
    const { name, tagCategoryId, language, description, isAlias, canonicalId: canonicalTagName } = body; // categoryとcolorを削除し、tagCategoryIdを受け取る

    // 必須フィールドの検証
    if (!name || !tagCategoryId || !language) {
      return NextResponse.json({ message: '必須フィールドが不足しています (name, tagCategoryId, language)。' }, { status: 400 });
    }

    let canonicalTagId = null;
    // canonicalTagNameが指定されている場合は、そのタグ名に対応するIDを取得
    if (isAlias && canonicalTagName) {
        const canonicalTag = await prisma.tag.findUnique({
            where: { name: canonicalTagName }, // タグ名で検索
            select: { id: true }
        });
        if (!canonicalTag) {
            return NextResponse.json({ message: `指定された正規タグ名 '${canonicalTagName}' が存在しません。`, field: 'canonicalId' }, { status: 400 });
        }
        canonicalTagId = canonicalTag.id;
    } else if (isAlias && !canonicalTagName) {
         return NextResponse.json({ message: 'エイリアスの場合、正規タグ名 (canonicalId) は必須です。', field: 'canonicalId' }, { status: 400 });
    } else if (!isAlias && canonicalTagName) {
         return NextResponse.json({ message: 'エイリアスでない場合、正規タグ名 (canonicalId) は指定できません。', field: 'canonicalId' }, { status: 400 });
    }


    const newTag = await prisma.tag.create({
      data: {
        name,
        tagCategoryId, // tagCategoryId を保存
        language,
        description,
        isAlias: isAlias || false, // デフォルトはfalse
        canonicalId: canonicalTagId, // 取得した正規タグIDを設定
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
    const { id, name, tagCategoryId, language, description, isAlias, canonicalId: canonicalTagName } = body; // categoryとcolorを削除し、tagCategoryIdを受け取る

    // idは必須
    if (!id) {
      return NextResponse.json({ message: '更新対象のタグID (id) が必要です。', field: 'id' }, { status: 400 });
    }

    // canonicalIdが指定されている場合は、そのタグが存在するか確認
    let canonicalTagId = null;
    // canonicalTagNameが指定されている場合は、そのタグ名に対応するIDを取得
    if (isAlias && canonicalTagName) {
        const canonicalTag = await prisma.tag.findUnique({
            where: { name: canonicalTagName }, // タグ名で検索
            select: { id: true }
        });
        if (!canonicalTag) {
            return NextResponse.json({ message: `指定された正規タグ名 '${canonicalTagName}' が存在しません。`, field: 'canonicalId' }, { status: 400 });
        }
        canonicalTagId = canonicalTag.id;
    } else if (isAlias && !canonicalTagName) {
         return NextResponse.json({ message: 'エイリアスの場合、正規タグ名 (canonicalId) は必須です。', field: 'canonicalId' }, { status: 400 });
    } else if (!isAlias && canonicalTagName) {
         return NextResponse.json({ message: 'エイリアスでない場合、正規タグ名 (canonicalId) は指定できません。', field: 'canonicalId' }, { status: 400 });
    }


    const updatedTag = await prisma.tag.update({
      where: { id: id },
      data: {
        name,
        tagCategoryId, // tagCategoryId を保存
        language,
        description,
        isAlias: isAlias ?? undefined, // undefinedの場合は更新しない
        canonicalId: isAlias ? canonicalTagId : null, // 取得した正規タグIDを設定
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