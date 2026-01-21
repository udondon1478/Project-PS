// src/types/tag.ts
// 管理画面で使用するタグ関連の共通型定義

import { Tag } from '@prisma/client';

/**
 * APIから取得するタグの型定義（関連するカテゴリ情報を含む）
 */
export interface TagWithCategory extends Tag {
  tagCategory?: {
    id: string;
    name: string;
    color: string;
  } | null;
  canonicalTag?: {
    id: string;
    name: string;
    displayName: string | null;
  } | null;
  _count?: {
    productTags: number;
  };
}
