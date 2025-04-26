# ヘッダーコンポーネント実装計画

1.  **ヘッダーコンポーネントの作成:**
    *   `src/app/components/common/Header.tsx`を作成し、基本的なヘッダーの構造を定義します。
    *   ヘッダーには、「ログイン」ボタンとプロフィールページへのリンクを配置します。
    *   Auth.jsの`useSession`フックを使用して、認証状態を取得し、UIを動的に変更します。
2.  **クライアントサイドレンダリングの指定:**
    *   `"use client"`ディレクティブを`Header.tsx`の先頭に追加し、クライアントサイドレンダリングを指定します。
3.  **`SessionProvider`の配置:**
    *   `src/app/layout.tsx`で`<SessionProvider>`を使用して、アプリケーション全体を囲みます。
4.  **トップページへのヘッダーの組み込み:**
    *   `src/app/page.tsx`にヘッダーコンポーネントをインポートし、ページに組み込みます。

## 必要なimport文

```
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from '@/components/ui/button';
import ProductSearch from '@/components