# ガイドラインサイドパネル機能仕様書

## 📋 概要

現在のタグガイドラインはモーダルウィンドウで表示されているため、ユーザーがガイドラインを参照しながら実際にタグ付けやレーティング判定を行うことができません。この仕様書では、デスクトップ環境でサイドパネル方式を導入し、UXを大幅に向上させる実装計画を定義します。

**目標**: ガイドラインとフローチャートを閲覧しつつ、タグ入力やレーティング設定を同時に行える環境を提供する

---

## 🎯 意思決定サマリー

| 項目 | 選択 | 理由 | 補足 |
|------|------|------|------|
| **レイアウト方式** | デバイス別最適化 | デスクトップはサイドパネル、モバイルはシート | 既存の`GuidelineContainer`が採用している方式を踏襲 |
| **初期表示状態** | LocalStorage判定 | 初回は開いた状態、2回目以降は閉じた状態 | ユーザー教育と慣れたユーザーの利便性を両立 |
| **コンテンツ範囲** | 全タブ表示 | レーティング、タグカテゴリ、VRChat等すべて | 全情報にアクセス可能、初期タブは動的に設定 |
| **モバイル表示** | 現行通りシート維持 | 下から表示 | 既存実装を活用、BOOTHなどで慣れた操作 |
| **パネル幅** | 画面の40% | ガイドラインとフローチャートが見やすい | フォームは右側に配置、商品情報が隠れてもOK |
| **パネル位置** | 左からスライドイン | 商品情報をオーバーレイ、フォームは常に表示 | 商品タイトル・説明は自動取得のため隠れてもOK |
| **アニメーション** | スライド+フェード | 滑らかな視覚効果 | 250-300ms推奨 |
| **状態管理** | React state | ページ内で完結 | シンプルな実装、初回判定のみLocalStorage |
| **実装方針** | GuidelineContainer拡張 | 既存コード活用、段階的移行 | `mode`プロパティで切り替え |

---

## 🏗️ アーキテクチャ設計

### コンポーネント構成

```
GuidelineContainer (拡張)
├── mode: 'modal' | 'sidepanel' プロパティ追加
├── 768px未満 → GuidelineSheet (既存)
└── 768px以上
    ├── mode='modal' → GuidelineDialog (既存)
    └── mode='sidepanel' → GuidelineSidePanel (新規)
        ├── タブ機能 (既存GuidelineDialogから移植)
        ├── RatingFlowchart (既存コンポーネント再利用)
        ├── TagCategoryVisualizer (既存コンポーネント再利用)
        └── フローチャートモード切り替え (既存機能)
```

### 新規ファイル

1. **`GuidelineSidePanel.tsx`**
   - GuidelineDialogをベースにサイドパネル用に最適化
   - 既存のタブ、コンテンツコンポーネントを再利用

2. **`useGuidelineFirstVisit.ts`** (カスタムフック)
   - LocalStorageで初回訪問判定
   - キー: `guideline-visited`
   - 値: `true` (訪問済み)

### 修正ファイル

1. **`GuidelineContainer.tsx`**
   - `mode` プロパティ追加
   - 条件分岐でGuidelineSidePanelを呼び出し

2. **`/app/register-item/page.tsx` または関連コンポーネント**
   - `mode="sidepanel"` を指定
   - `useGuidelineFirstVisit` フックで初期状態制御

---

## 💻 技術仕様

### 1. サイドパネル仕様

#### レイアウト

```css
.guideline-sidepanel {
  /* 位置 */
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  width: 40%; /* 画面幅の40% */

  /* 重ね順 */
  z-index: 40; /* ヘッダーより手前 */

  /* スタイル */
  background: white;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);

  /* スクロール */
  overflow-y: auto; /* パネル内で独立スクロール */

  /* アニメーション */
  transition: transform 250ms ease-in-out, opacity 250ms ease-in-out;
}

/* 閉じた状態 */
.guideline-sidepanel[data-state="closed"] {
  transform: translateX(-100%);
  opacity: 0;
}

/* 開いた状態 */
.guideline-sidepanel[data-state="open"] {
  transform: translateX(0);
  opacity: 1;
}
```

#### ブレークポイント

```typescript
// 768px以上でサイドパネル、未満でシート
const isMobile = useMediaQuery('(max-width: 768px)');
```

### 2. トグルボタン

#### 配置
- パネル内の右上隅に配置
- アイコン: `X` (閉じる) または `ChevronLeft`
- パネルを閉じると同時にボタンも非表示

#### 各セクションのガイドライン表示ボタン
- `/register-item` の各フィールド付近に既存のボタンを維持
- クリックでサイドパネルを開き、適切なタブを表示
  - レーティングフィールド付近 → `initialTab="rating"`
  - タグ入力フィールド付近 → `initialTab="categories"`

### 3. 初回訪問判定

#### LocalStorage実装

```typescript
// hooks/useGuidelineFirstVisit.ts
export function useGuidelineFirstVisit() {
  const [isFirstVisit, setIsFirstVisit] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem('guideline-visited');
  });

  useEffect(() => {
    if (isFirstVisit) {
      localStorage.setItem('guideline-visited', 'true');
    }
  }, [isFirstVisit]);

  return isFirstVisit;
}
```

#### 使用例

```typescript
const isFirstVisit = useGuidelineFirstVisit();
const [guidelineOpen, setGuidelineOpen] = useState(isFirstVisit);
```

### 4. キーボード操作

```typescript
// Escキーで閉じる
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      onOpenChange(false);
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [open, onOpenChange]);
```

### 5. アニメーション詳細

```typescript
// Tailwind CSS classes
<div
  className={cn(
    "fixed left-0 top-0 h-screen w-[40%]",
    "bg-background shadow-lg z-40",
    "transition-all duration-300 ease-in-out",
    open
      ? "translate-x-0 opacity-100"
      : "-translate-x-full opacity-0"
  )}
>
```

### 6. アクセシビリティ

```tsx
<aside
  role="complementary"
  aria-label="タグ付けガイドライン"
  aria-hidden={!open}
>
  <button
    aria-label="ガイドラインを閉じる"
    onClick={() => onOpenChange(false)}
  >
    <X className="h-4 w-4" />
  </button>

  {/* コンテンツ */}
</aside>
```

---

## 📱 レスポンシブ設計

### デスクトップ (768px以上)

```
┌─────────────────────────────────────────┐
│ Header                                   │
├──────────────┬──────────────────────────┤
│              │  商品登録フォーム         │
│  サイド      │  ┌────────────────────┐ │
│  パネル      │  │ 商品画像           │ │
│  (40%)       │  │ (右側60%)          │ │
│              │  └────────────────────┘ │
│ ┌─────────┐ │  ┌────────────────────┐ │
│ │ガイドライ│ │  │ レーティング       │ │
│ │ン        │ │  │ [選択ボックス]     │ │
│ │         │ │  └────────────────────┘ │
│ │フローチ  │ │  ┌────────────────────┐ │
│ │ャート   │ │  │ タグ入力           │ │
│ │         │ │  │ [入力フィールド]   │ │
│ └─────────┘ │  └────────────────────┘ │
│              │                          │
└──────────────┴──────────────────────────┘
```

**特徴:**
- 左40%: サイドパネル（ガイドライン）
- 右60%: フォーム（商品画像、レーティング、タグ入力）
- 左側の商品タイトル・説明はパネルに隠れる（自動取得のため問題なし）

### モバイル/タブレット (768px未満)

```
┌─────────────────────┐
│ Header              │
├─────────────────────┤
│ 商品登録フォーム    │
│                     │
│ [レーティング]      │
│                     │
│ [タグ入力]          │
│                     │
│ [ガイドライン表示]  │ ← タップでシート表示
└─────────────────────┘

(シート表示時)
┌─────────────────────┐
│ 商品登録フォーム    │ ← 背景に見える
├─────────────────────┤
│ ガイドライン        │
│ ┌─────────────────┐ │
│ │ レーティング    │ │
│ │                 │ │
│ │ (シートUI)      │ │
│ └─────────────────┘ │
└─────────────────────┘
```

**特徴:**
- 現行のGuidelineSheetをそのまま使用
- 下から上にスライドして表示
- フォームとガイドラインを切り替えながら参照

---

## 🎨 UIコンポーネント詳細

### GuidelineSidePanel.tsx

```typescript
'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toggle } from '@/components/ui/toggle';
import { Workflow, ListTree } from 'lucide-react';
import { RatingFlowchart } from './RatingFlowchart';
import { RatingFlowchartDiagram } from './RatingFlowchartDiagram';
import { TagCategoryVisualizer } from './TagCategoryVisualizer';
import { FlowchartMode } from '@/data/guidelines';

interface GuidelineSidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'rating' | 'categories';
  initialRatingFlow?: boolean;
}

export function GuidelineSidePanel({
  open,
  onOpenChange,
  initialTab = 'rating',
  initialRatingFlow = false,
}: GuidelineSidePanelProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [flowchartMode, setFlowchartMode] = useState<FlowchartMode>(
    initialRatingFlow ? 'interactive' : 'diagram'
  );

  // Escキーで閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  return (
    <aside
      role="complementary"
      aria-label="タグ付けガイドライン"
      aria-hidden={!open}
      className={cn(
        "fixed left-0 top-0 h-screen w-[40%] z-40",
        "bg-background border-r shadow-lg",
        "transition-all duration-300 ease-in-out",
        "flex flex-col",
        open
          ? "translate-x-0 opacity-100"
          : "-translate-x-full opacity-0 pointer-events-none"
      )}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div>
          <h2 className="text-lg font-semibold">タグ付けガイドライン</h2>
          <p className="text-sm text-muted-foreground">
            商品に適切なタグを付与するためのガイドラインです
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          aria-label="ガイドラインを閉じる"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* タブコンテンツ */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'rating' | 'categories')}
        className="flex-1 flex flex-col px-6 py-4 min-h-0"
      >
        <TabsList className="grid w-full grid-cols-2 shrink-0">
          <TabsTrigger value="rating">レーティング</TabsTrigger>
          <TabsTrigger value="categories">タグカテゴリ</TabsTrigger>
        </TabsList>

        <TabsContent
          value="rating"
          className="flex-1 mt-4 flex flex-col min-h-0 data-[state=inactive]:hidden"
        >
          {/* モード切り替え */}
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <Toggle
              pressed={flowchartMode === 'interactive'}
              onPressedChange={() => setFlowchartMode('interactive')}
              aria-label="ステップ形式に切り替え"
            >
              <Workflow className="mr-2 h-4 w-4" />
              ステップ形式
            </Toggle>
            <Toggle
              pressed={flowchartMode === 'diagram'}
              onPressedChange={() => setFlowchartMode('diagram')}
              aria-label="図表で見る"
            >
              <ListTree className="mr-2 h-4 w-4" />
              図表で見る
            </Toggle>
          </div>

          {/* コンテンツエリア（スクロール可能） */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {flowchartMode === 'interactive' ? (
              <RatingFlowchart onClose={() => onOpenChange(false)} />
            ) : (
              <RatingFlowchartDiagram />
            )}
          </div>
        </TabsContent>

        <TabsContent
          value="categories"
          className="flex-1 mt-4 min-h-0 data-[state=inactive]:hidden overflow-y-auto"
        >
          <TagCategoryVisualizer />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
```

### GuidelineContainer.tsx (拡張版)

```typescript
'use client';

import { useMediaQuery } from '@/hooks/useMediaQuery';
import { GuidelineDialog } from './GuidelineDialog';
import { GuidelineSheet } from './GuidelineSheet';
import { GuidelineSidePanel } from './GuidelineSidePanel';

interface GuidelineContainerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'rating' | 'categories';
  initialRatingFlow?: boolean;
  mode?: 'modal' | 'sidepanel'; // 新規追加
}

export function GuidelineContainer({
  mode = 'modal', // デフォルトは既存のモーダル
  ...props
}: GuidelineContainerProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  // モバイルは常にシート
  if (isMobile) {
    return <GuidelineSheet {...props} />;
  }

  // デスクトップはmodeに応じて切り替え
  return mode === 'sidepanel'
    ? <GuidelineSidePanel {...props} />
    : <GuidelineDialog {...props} />;
}
```

---

## 🚀 実装計画

### フェーズ1: `/register-item` ページ (優先)

**目標**: 商品登録時にサイドパネルでガイドラインを参照できるようにする

#### タスク

1. **新規コンポーネント作成**
   - [ ] `GuidelineSidePanel.tsx` を作成
   - [ ] `useGuidelineFirstVisit.ts` カスタムフックを作成

2. **既存コンポーネント修正**
   - [ ] `GuidelineContainer.tsx` に `mode` プロパティ追加
   - [ ] `/app/register-item` で `mode="sidepanel"` を指定

3. **初回訪問判定**
   - [ ] `useGuidelineFirstVisit` フックを統合
   - [ ] 初回は開いた状態、2回目以降は閉じた状態

4. **UI調整**
   - [ ] トグルボタンのスタイル調整
   - [ ] アニメーション調整
   - [ ] レスポンシブ確認

5. **テスト**
   - [ ] デスクトップでサイドパネル表示確認
   - [ ] モバイルでシート表示確認（既存機能）
   - [ ] 初回訪問時の挙動確認
   - [ ] Escキーで閉じる動作確認
   - [ ] タブ切り替え動作確認

### フェーズ2: 商品詳細ページのタグ編集 (次フェーズ)

**前提**: 商品詳細ページにタグ編集モーダルが実装されている必要がある

#### タスク

1. **タグ編集モーダル実装**
   - [ ] 商品詳細ページにタグ編集機能を追加（別タスク）

2. **サイドパネル統合**
   - [ ] タグ編集モーダル表示時に `mode="sidepanel"` を指定
   - [ ] モーダルとサイドパネルの共存を確認

3. **テスト**
   - [ ] 編集モード時のサイドパネル動作確認

---

## 🧪 テストケース

### ユニットテスト

1. **GuidelineSidePanel**
   - [ ] openがtrueの時、パネルが表示される
   - [ ] openがfalseの時、パネルが非表示になる
   - [ ] Escキーでパネルが閉じる
   - [ ] 閉じるボタンクリックでonOpenChangeが呼ばれる
   - [ ] タブ切り替えが正常に動作する

2. **useGuidelineFirstVisit**
   - [ ] 初回訪問時にtrueを返す
   - [ ] LocalStorageに値が保存される
   - [ ] 2回目以降はfalseを返す

3. **GuidelineContainer**
   - [ ] mode='sidepanel'でGuidelineSidePanelがレンダリングされる
   - [ ] mode='modal'でGuidelineDialogがレンダリングされる
   - [ ] モバイルでは常にGuidelineSheetがレンダリングされる

### E2Eテスト

1. **初回訪問フロー**
   - [ ] `/register-item` に初回アクセス時、サイドパネルが開いた状態
   - [ ] パネルを閉じて、ページをリロード → パネルは閉じた状態

2. **操作フロー**
   - [ ] ガイドライン表示ボタンクリック → サイドパネル表示
   - [ ] タブ切り替え → コンテンツが切り替わる
   - [ ] フローチャートモード切り替え → 表示が切り替わる
   - [ ] Escキー押下 → パネルが閉じる

3. **レスポンシブ**
   - [ ] デスクトップ(1920px) → サイドパネル表示
   - [ ] タブレット(768px) → サイドパネル表示
   - [ ] タブレット(767px) → シート表示
   - [ ] モバイル(375px) → シート表示

---

## 📝 次のステップ

### Phase 3で詳細インタビュー予定の項目

以下の項目は実装フェーズで詳細を決定します:

1. **エラーハンドリング**
   - LocalStorage利用不可時の挙動
   - コンテンツ読み込みエラー時の表示

2. **パフォーマンス最適化**
   - コンテンツの遅延読み込み
   - アニメーション最適化

3. **アクセシビリティ詳細**
   - スクリーンリーダー対応の最終調整
   - フォーカス管理

4. **将来の拡張性**
   - `/guidelines` ページでのサイドパネル比較表示機能
   - パネル幅のカスタマイズ機能（将来的な検討）

---

## 📚 参考資料

### 既存実装

- `src/components/guidelines/GuidelineContainer.tsx`
- `src/components/guidelines/GuidelineDialog.tsx`
- `src/components/guidelines/GuidelineSheet.tsx`
- `src/components/guidelines/RatingFlowchart.tsx`
- `src/components/guidelines/TagCategoryVisualizer.tsx`

### 使用技術

- **UI Framework**: React 18+ (Next.js App Router)
- **UIコンポーネント**: shadcn/ui (Dialog, Tabs, Toggle, Button, ScrollArea)
- **スタイリング**: Tailwind CSS
- **状態管理**: React state + LocalStorage (初回判定のみ)
- **型定義**: TypeScript

---

## ✅ 完了条件

### フェーズ1完了の定義

- [ ] `/register-item` でサイドパネルが正常に動作
- [ ] デスクトップ(768px以上)でサイドパネル表示
- [ ] モバイル(768px未満)でシート表示（既存機能）
- [ ] 初回訪問時のみサイドパネルが開いた状態
- [ ] すべてのテストケースが通過
- [ ] アクセシビリティチェック完了
- [ ] コードレビュー完了

---

**作成日**: 2026-01-08
**最終更新**: 2026-01-08
**ステータス**: ✅ 仕様確定済み - 実装準備完了
