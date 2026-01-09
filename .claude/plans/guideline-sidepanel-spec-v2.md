# ガイドラインサイドパネル実装プラン

## 📋 エグゼクティブサマリー

現在のタグガイドラインはモーダルウィンドウで表示されているため、ユーザーがガイドラインを参照しながらタグ付けやレーティング判定が行えません。このプランでは、デスクトップ環境でサイドパネル方式を導入し、ガイドラインとフォームを同時に操作可能にすることで、UXを大幅に向上させます。

**目標**: ガイドラインとフローチャートを閲覧しつつ、タグ入力やレーティング設定を同時に行える環境を提供する

**スコープ**: フェーズ1として `/register-item` ページのみ実装

---

## 🎯 意思決定サマリー（全16項目）

### UI/UX設計

| 項目 | 決定 | 理由 |
|------|------|------|
| **再オープンUI** | 各フィールド付近のボタンのみ | シンプル、既存UIを活用 |
| **完了時の挙動** | パネル開いたまま維持 | 判定結果を確認しながら入力可能 |
| **オーバーレイ** | なし | パネルとフォームを同時操作可能 |
| **パネル外クリック** | 閉じない | 誤クリック防止、ユーザー意図を尊重 |
| **フォーカス管理** | トラップなし | パネルとフォーム間を自由に移動可能 |
| **初期タブ制御** | initialTabを動的設定 | コンテキストに応じた表示 |
| **スクロール範囲** | コンテンツエリアのみ | ヘッダー・タブは常に表示 |

### レスポンシブ設計

| 項目 | 決定 | 詳細 |
|------|------|------|
| **ブレークポイント** | 1024px | デスクトップ(1024px以上)=サイドパネル、タブレット/モバイル(1023px以下)=シート |
| **パネル幅** | `clamp(450px, 40vw, 600px)` | 画面サイズに応じた最適化 |
| **アニメーション** | 250ms ease-in-out | バランスの良い速度 |

### データ永続化

| 項目 | 決定 | 実装 |
|------|------|------|
| **初回判定範囲** | ページごとに個別 | キー: `guideline-visited-register` |
| **LocalStorageエラー** | 開いた状態（初回扱い） | プライベートモードでも機能紹介 |

### パフォーマンス・技術

| 項目 | 決定 | 詳細 |
|------|------|------|
| **マウントタイミング** | 初回=即時、2回目以降=遅延 | 条件付きレンダリング |
| **z-index** | 40 | ヘッダーより手前 |
| **エラー表示** | メッセージ表示 | デバッグしやすい |

---

## 🏗️ アーキテクチャ設計

### コンポーネント構成

```text
GuidelineContainer (拡張)
├── mode: 'modal' | 'sidepanel' プロパティ追加
├── < 1024px → GuidelineSheet (既存、タブレット・モバイル)
└── ≥ 1024px (デスクトップ)
    ├── mode='modal' → GuidelineDialog (既存)
    └── mode='sidepanel' → GuidelineSidePanel (新規)
        ├── 固定ヘッダー（タイトル + 閉じるボタン）
        ├── タブナビゲーション（固定）
        ├── モード切り替えトグル（固定）
        └── スクロール可能コンテンツエリア
            ├── RatingFlowchart (既存コンポーネント再利用)
            ├── RatingFlowchartDiagram (既存コンポーネント再利用)
            └── TagCategoryVisualizer (既存コンポーネント再利用)
```

### 新規ファイル

1. **`src/components/guidelines/GuidelineSidePanel.tsx`**
   - GuidelineDialogをベースにサイドパネル用に最適化
   - 既存のタブ、コンテンツコンポーネントを再利用
   - オーバーレイなし、フォーカストラップなし

2. **`src/hooks/useGuidelineFirstVisit.ts`** (カスタムフック)
   - LocalStorageで初回訪問判定
   - ページごとのキー管理: `guideline-visited-${page}`
   - エラーハンドリング（localStorage無効時は常に初回扱い）

### 修正ファイル

1. **`src/components/guidelines/GuidelineContainer.tsx`**
   - `mode` プロパティ追加
   - ブレークポイント変更: 1024px
   - 条件分岐でGuidelineSidePanelを呼び出し

2. **`src/app/register-item/page.tsx` または関連コンポーネント**
   - `mode="sidepanel"` を指定
   - `useGuidelineFirstVisit('register')` フックで初期状態制御
   - 初回訪問時のみパネル開いた状態でマウント
   - 2回目以降はクリック時に遅延マウント

---

## 💻 技術仕様

### 1. サイドパネル仕様

#### レイアウト

```css
// CSS仕様
.guideline-sidepanel {
  /* 位置 */
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  width: clamp(450px, 40vw, 600px); /* レスポンシブ幅 */

  /* 重ね順 */
  z-index: 40; /* ヘッダーより手前 */

  /* スタイル */
  background: white;
  border-right: 1px solid hsl(var(--border));
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);

  /* アニメーション */
  transition: transform 250ms ease-in-out, opacity 250ms ease-in-out;
}

/* 閉じた状態 */
.guideline-sidepanel[data-state="closed"] {
  transform: translateX(-100%);
  opacity: 0;
  pointer-events: none; /* クリック防止 */
}

/* 開いた状態 */
.guideline-sidepanel[data-state="open"] {
  transform: translateX(0);
  opacity: 1;
}
```

#### 内部構造（スクロール制御）

```tsx
<aside className="fixed left-0 top-0 h-screen w-[clamp(450px,40vw,600px)] flex flex-col">
  {/* 固定ヘッダー */}
  <div className="shrink-0 px-6 py-4 border-b">
    <h2>タグ付けガイドライン</h2>
    <Button onClick={onClose}><X /></Button>
  </div>

  {/* タブナビゲーション（固定） */}
  <TabsList className="shrink-0 px-6 pt-4">
    <TabsTrigger value="rating">レーティング</TabsTrigger>
    <TabsTrigger value="categories">タグカテゴリ</TabsTrigger>
  </TabsList>

  {/* モード切り替え（固定） */}
  <div className="shrink-0 px-6 py-2 flex gap-2">
    <Toggle>ステップ形式</Toggle>
    <Toggle>図表で見る</Toggle>
  </div>

  {/* スクロール可能コンテンツエリア */}
  <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0">
    {flowchartMode === 'interactive' ? (
      <RatingFlowchart onClose={onClose} />
    ) : (
      <RatingFlowchartDiagram />
    )}
  </div>
</aside>
```

#### ブレークポイント

```typescript
// 1024px以上でサイドパネル、未満でシート
const isDesktop = useMediaQuery('(min-width: 1024px)');

// GuidelineContainer.tsx
if (!isDesktop) {
  return <GuidelineSheet {...props} />;
}

return mode === 'sidepanel'
  ? <GuidelineSidePanel {...props} />
  : <GuidelineDialog {...props} />;
```

### 2. 初回訪問判定

#### LocalStorage実装

```typescript
// hooks/useGuidelineFirstVisit.ts
export function useGuidelineFirstVisit(page: string) {
  const [isFirstVisit, setIsFirstVisit] = useState(() => {
    if (typeof window === 'undefined') return false;

    try {
      const key = `guideline-visited-${page}`;
      return !localStorage.getItem(key);
    } catch (error) {
      // LocalStorage無効時は常に初回扱い（開いた状態）
      console.warn('localStorage unavailable:', error);
      return true;
    }
  });

  useEffect(() => {
    if (isFirstVisit && typeof window !== 'undefined') {
      try {
        const key = `guideline-visited-${page}`;
        localStorage.setItem(key, 'true');
      } catch (error) {
        // エラーは無視（プライベートモード等）
        console.warn('Failed to save visit state:', error);
      }
    }
  }, [isFirstVisit, page]);

  return isFirstVisit;
}
```

#### 使用例（条件付きマウント）

```typescript
// /app/register-item/page.tsx
const isFirstVisit = useGuidelineFirstVisit('register');
const [guidelineOpen, setGuidelineOpen] = useState(isFirstVisit);
const [shouldMount, setShouldMount] = useState(isFirstVisit);

// パネルを開く時にマウント
const handleOpenGuideline = (tab: 'rating' | 'categories') => {
  setShouldMount(true);
  setGuidelineOpen(true);
  setInitialTab(tab);
};

return (
  <>
    {/* フォームエリア */}
    <div>
      <RatingField>
        <Button onClick={() => handleOpenGuideline('rating')}>
          レーティングガイドライン
        </Button>
      </RatingField>

      <TagInput>
        <Button onClick={() => handleOpenGuideline('categories')}>
          タグカテゴリ
        </Button>
      </TagInput>
    </div>

    {/* サイドパネル - 条件付きマウント */}
    {shouldMount && (
      <GuidelineContainer
        mode="sidepanel"
        open={guidelineOpen}
        onOpenChange={setGuidelineOpen}
        initialTab={initialTab}
      />
    )}
  </>
);
```

### 3. キーボード操作

```typescript
// Escキーで閉じる（フォーカストラップなし）
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

### 4. アクセシビリティ

```tsx
<aside
  role="complementary"
  aria-label="タグ付けガイドライン"
  aria-hidden={!open}
  // フォーカストラップなし - パネルとフォーム間を自由に移動可能
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

### 5. エラーハンドリング

```tsx
// GuidelineSidePanel.tsx
const [error, setError] = useState<Error | null>(null);

try {
  // コンテンツ読み込み
} catch (err) {
  setError(err as Error);
}

if (error) {
  return (
    <div className="p-6 text-destructive">
      <p className="font-semibold">ガイドラインの読み込みに失敗しました</p>
      <p className="text-sm mt-2">{error.message}</p>
      <Button onClick={() => window.location.reload()} className="mt-4">
        再読み込み
      </Button>
    </div>
  );
}
```

---

## 📱 レスポンシブ設計

### デスクトップ (1024px以上)

```text
┌─────────────────────────────────────────┐
│ Header                                   │
├──────────────┬──────────────────────────┤
│              │  商品登録フォーム         │
│  サイド      │  ┌────────────────────┐ │
│  パネル      │  │ 商品画像           │ │
│  (450-600px) │  │ (残り領域)         │ │
│              │  └────────────────────┘ │
│ ┌─────────┐ │  ┌────────────────────┐ │
│ │レーティン│ │  │ レーティング       │ │
│ │グ        │ │  │ [選択ボックス]     │ │
│ │         │ │  │ [ガイドライン表示] │ │
│ │フロー   │ │  └────────────────────┘ │
│ │チャート │ │  ┌────────────────────┐ │
│ │         │ │  │ タグ入力           │ │
│ │(スクロー│ │  │ [入力フィールド]   │ │
│ │ル)      │ │  │ [ガイドライン表示] │ │
│ └─────────┘ │  └────────────────────┘ │
└──────────────┴──────────────────────────┘
```

**特徴:**
- 左側: サイドパネル（450-600px、画面幅40%を基準）
- 右側: フォーム（残り全領域）
- 左側の商品タイトル・説明はパネルに隠れる（自動取得のため問題なし）
- オーバーレイなし、同時操作可能

### タブレット (768px - 1023px)

```text
┌─────────────────────┐
│ Header              │
├─────────────────────┤
│ 商品登録フォーム    │
│                     │
│ [レーティング]      │
│ [ガイドライン表示]  │ ← タップでシート表示
│                     │
│ [タグ入力]          │
│ [ガイドライン表示]  │ ← タップでシート表示
└─────────────────────┘

(シート表示時)
┌─────────────────────┐
│ 商品登録フォーム    │ ← 背景に見える
├─────────────────────┤
│ ガイドライン        │
│ ┌─────────────────┐ │
│ │ レーティング    │ │
│ │ (シートUI)      │ │
│ └─────────────────┘ │
└─────────────────────┘
```

**特徴:**
- GuidelineSheet使用（既存実装）
- 下から上にスライド

### モバイル (767px以下)

同上（GuidelineSheet使用）

---

## 🎨 実装コード例

### GuidelineSidePanel.tsx（完全版）

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
  const [error, setError] = useState<Error | null>(null);

  // initialTabが変更されたら反映
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

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

  // エラーハンドリング
  if (error) {
    return (
      <aside
        role="complementary"
        aria-label="タグ付けガイドライン"
        className={cn(
          "fixed left-0 top-0 h-screen w-[clamp(450px,40vw,600px)] z-40",
          "bg-background border-r shadow-lg",
          "flex flex-col items-center justify-center p-6",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="text-destructive text-center">
          <p className="font-semibold text-lg">ガイドラインの読み込みに失敗しました</p>
          <p className="text-sm mt-2">{error.message}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            再読み込み
          </Button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      role="complementary"
      aria-label="タグ付けガイドライン"
      aria-hidden={!open}
      className={cn(
        "fixed left-0 top-0 h-screen w-[clamp(450px,40vw,600px)] z-40",
        "bg-background border-r shadow-lg",
        "transition-all duration-250 ease-in-out",
        "flex flex-col",
        open
          ? "translate-x-0 opacity-100"
          : "-translate-x-full opacity-0 pointer-events-none"
      )}
    >
      {/* 固定ヘッダー */}
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
        className="flex-1 flex flex-col min-h-0"
      >
        {/* 固定タブリスト */}
        <TabsList className="grid w-full grid-cols-2 shrink-0 mx-6 mt-4">
          <TabsTrigger value="rating">レーティング</TabsTrigger>
          <TabsTrigger value="categories">タグカテゴリ</TabsTrigger>
        </TabsList>

        <TabsContent
          value="rating"
          className="flex-1 mt-0 flex flex-col min-h-0 data-[state=inactive]:hidden"
        >
          {/* 固定モード切り替え */}
          <div className="flex items-center gap-2 px-6 py-3 shrink-0">
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

          {/* スクロール可能コンテンツエリア */}
          <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0">
            {flowchartMode === 'interactive' ? (
              <RatingFlowchart
                onClose={() => {
                  // フローチャート完了時もパネルは開いたまま
                  // ユーザーが手動で閉じる
                }}
              />
            ) : (
              <RatingFlowchartDiagram />
            )}
          </div>
        </TabsContent>

        <TabsContent
          value="categories"
          className="flex-1 mt-0 min-h-0 data-[state=inactive]:hidden overflow-y-auto px-6 py-4"
        >
          <TagCategoryVisualizer />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
```

### GuidelineContainer.tsx（拡張版）

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
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // 1024px未満は常にシート
  if (!isDesktop) {
    return <GuidelineSheet {...props} />;
  }

  // デスクトップはmodeに応じて切り替え
  return mode === 'sidepanel'
    ? <GuidelineSidePanel {...props} />
    : <GuidelineDialog {...props} />;
}
```

### useGuidelineFirstVisit.ts（完全版）

```typescript
import { useState, useEffect } from 'react';

/**
 * ページごとの初回訪問判定フック
 * @param page ページ識別子 (例: 'register', 'edit')
 * @returns 初回訪問かどうか
 */
export function useGuidelineFirstVisit(page: string): boolean {
  const [isFirstVisit, setIsFirstVisit] = useState(() => {
    if (typeof window === 'undefined') return false;

    try {
      const key = `guideline-visited-${page}`;
      return !localStorage.getItem(key);
    } catch (error) {
      // LocalStorage無効時は常に初回扱い（開いた状態）
      console.warn('localStorage unavailable:', error);
      return true;
    }
  });

  useEffect(() => {
    if (isFirstVisit && typeof window !== 'undefined') {
      try {
        const key = `guideline-visited-${page}`;
        localStorage.setItem(key, 'true');
      } catch (error) {
        // エラーは無視（プライベートモード等）
        console.warn('Failed to save visit state:', error);
      }
    }
  }, [isFirstVisit, page]);

  return isFirstVisit;
}
```

### /app/register-item/page.tsx（使用例）

```typescript
'use client';

import { useState } from 'react';
import { useGuidelineFirstVisit } from '@/hooks/useGuidelineFirstVisit';
import { GuidelineContainer } from '@/components/guidelines/GuidelineContainer';
import { Button } from '@/components/ui/button';

export default function RegisterItemPage() {
  const isFirstVisit = useGuidelineFirstVisit('register');

  // 初回訪問時はパネル開いた状態で即マウント
  const [guidelineOpen, setGuidelineOpen] = useState(isFirstVisit);
  const [shouldMount, setShouldMount] = useState(isFirstVisit);
  const [initialTab, setInitialTab] = useState<'rating' | 'categories'>('rating');

  // パネルを開く処理（2回目以降はここで初めてマウント）
  const handleOpenGuideline = (tab: 'rating' | 'categories') => {
    setShouldMount(true);
    setGuidelineOpen(true);
    setInitialTab(tab);
  };

  return (
    <div className="container mx-auto p-6">
      <h1>商品登録</h1>

      {/* フォームエリア */}
      <div className="space-y-6">
        {/* レーティングフィールド */}
        <div>
          <label>レーティング</label>
          <select>{/* ... */}</select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenGuideline('rating')}
          >
            レーティングガイドライン
          </Button>
        </div>

        {/* タグ入力フィールド */}
        <div>
          <label>タグ</label>
          <input type="text" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenGuideline('categories')}
          >
            タグカテゴリ
          </Button>
        </div>
      </div>

      {/* サイドパネル - 条件付きマウント */}
      {shouldMount && (
        <GuidelineContainer
          mode="sidepanel"
          open={guidelineOpen}
          onOpenChange={setGuidelineOpen}
          initialTab={initialTab}
        />
      )}
    </div>
  );
}
```

#### カスタムフック統合提案

現在の実装では3つの状態(`guidelineOpen`, `shouldMount`, `initialTab`)を個別に管理していますが、これらを単一のカスタムフック `useGuidelinePanelState` に抽出することで、コードの保守性と再利用性を向上できます。

```typescript
// hooks/useGuidelinePanelState.ts
export function useGuidelinePanelState(page: string) {
  const isFirstVisit = useGuidelineFirstVisit(page);
  const [guidelineOpen, setGuidelineOpen] = useState(isFirstVisit);
  const [shouldMount, setShouldMount] = useState(isFirstVisit);
  const [initialTab, setInitialTab] = useState<'rating' | 'categories'>('rating');

  const openGuideline = useCallback((tab: 'rating' | 'categories') => {
    setShouldMount(true);
    setGuidelineOpen(true);
    setInitialTab(tab);
  }, []);

  return {
    guidelineOpen,
    setGuidelineOpen,
    shouldMount,
    initialTab,
    openGuideline,
  };
}

// 使用例
export default function RegisterItemPage() {
  const {
    guidelineOpen,
    setGuidelineOpen,
    shouldMount,
    initialTab,
    openGuideline,
  } = useGuidelinePanelState('register');

  return (
    // ... 上記と同様
    <Button onClick={() => openGuideline('rating')}>
      レーティングガイドライン
    </Button>
  );
}
```

---

## 🚀 実装フェーズ

### フェーズ1: `/register-item` ページ（本プランのスコープ）

#### タスク1: 新規コンポーネント作成

1. **GuidelineSidePanel.tsx**
   - 上記の完全版コードを作成
   - レイアウト: 固定ヘッダー、固定タブ、スクロール可能コンテンツ
   - スタイル: `clamp(450px, 40vw, 600px)` 幅、z-index: 40
   - アニメーション: 250ms ease-in-out
   - キーボード: Escで閉じる
   - エラーハンドリング: メッセージ表示

2. **useGuidelineFirstVisit.ts**
   - ページごとのキー管理: `guideline-visited-${page}`
   - LocalStorageエラーハンドリング: 常に初回扱い
   - SSR対応: `typeof window === 'undefined'` チェック

#### タスク2: 既存コンポーネント修正

1. **GuidelineContainer.tsx**
   - `mode` プロパティ追加（'modal' | 'sidepanel'）
   - ブレークポイント変更: 1024px
   - 条件分岐: mode='sidepanel' → GuidelineSidePanel

2. **src/app/register-item/page.tsx**
   - `useGuidelineFirstVisit('register')` 導入
   - 条件付きマウント: 初回=即時、2回目以降=クリック時
   - 初期タブ動的設定: レーティングボタン→'rating'、タグボタン→'categories'

#### タスク3: スタイリング調整

1. **Tailwindクラス設定**
   - `w-[clamp(450px,40vw,600px)]`
   - `duration-250` カスタムクラス追加（tailwind.config.ts）

2. **レスポンシブ確認**
   - 1366px、1920px、2560pxでパネル幅確認
   - 1024px境界でサイドパネル↔シート切り替え確認

#### タスク4: テスト

**ユニットテスト:**
- [ ] GuidelineSidePanel: open/closed状態
- [ ] useGuidelineFirstVisit: 初回/2回目判定
- [ ] GuidelineContainer: mode切り替え

**E2Eテスト:**
- [ ] 初回訪問: パネル開いた状態でマウント
- [ ] 2回目訪問: パネル閉じた状態、ボタンクリックで開く
- [ ] Escキー: パネルが閉じる
- [ ] タブ切り替え: コンテンツ切り替わり
- [ ] フローチャート完了: パネル開いたまま
- [ ] レスポンシブ: 1024px境界でシート↔サイドパネル

**アクセシビリティチェック:**
- [ ] スクリーンリーダー: role="complementary", aria-label
- [ ] キーボード: Tab/Shift+Tab、Escで閉じる
- [ ] フォーカス: パネル⇄フォーム間を自由に移動

---

## 🧪 検証方法

### 1. 機能検証

```bash
# 開発サーバー起動
npm run dev

# ブラウザで確認
open http://localhost:3000/register-item
```

**検証項目:**

1. **初回訪問シナリオ**
   - LocalStorageクリア: `localStorage.clear()`
   - `/register-item` にアクセス
   - ✅ サイドパネルが開いた状態で表示される
   - ✅ パネル幅が `clamp(450px, 40vw, 600px)` に従っている
   - ✅ ヘッダー、タブ、モード切り替えが固定
   - ✅ コンテンツエリアのみスクロール可能

2. **2回目以降の訪問シナリオ**
   - ページリロード
   - ✅ サイドパネルが閉じた状態
   - ✅ 「レーティングガイドライン」ボタンクリック → パネル開く、ratingタブ
   - ✅ 「タグカテゴリ」ボタンクリック → categoriesタブに切り替わる

3. **操作シナリオ**
   - ✅ パネル内でタブ切り替え → コンテンツ切り替わり
   - ✅ モード切り替え → ステップ形式⇄図表
   - ✅ フローチャート完了 → パネル開いたまま
   - ✅ Xボタンクリック → パネル閉じる
   - ✅ Escキー → パネル閉じる
   - ✅ パネル外クリック → 閉じない（フォーム入力可能）

4. **レスポンシブ検証**
   - ✅ 1920px: パネル幅600px（最大値）
   - ✅ 1366px: パネル幅546px（40vw）
   - ✅ 1280px: パネル幅512px（40vw）
   - ✅ 1124px: パネル幅450px（最小値）
   - ✅ 1023px: シート表示に切り替わる
   - ✅ 767px: シート表示

5. **LocalStorageエラー検証**
   - プライベートモードで `/register-item` にアクセス
   - ✅ パネルが開いた状態で表示される
   - ✅ コンソールに警告が出る（エラーではない）

### 2. パフォーマンス検証

```javascript
// DevTools Console
// 初回訪問時のマウント時間
performance.mark('sidepanel-mount-start');
// ... レンダリング後
performance.mark('sidepanel-mount-end');
performance.measure('sidepanel-mount', 'sidepanel-mount-start', 'sidepanel-mount-end');
```

**目標:**
- 初回マウント: < 100ms
- アニメーション: 250ms（仕様通り）
- 2回目以降のマウント: < 50ms

#### パフォーマンス目標の根拠

1. **初回マウント < 100ms**: アニメーション開始までに処理が完了する必要があるため、250msアニメーションの半分以下を目標とする。これにより、ユーザーがページを開いた瞬間にスムーズなアニメーションが開始される。

2. **2回目以降のマウント < 50ms**: レスポンシブなUIの基準である200ms応答性目標（[RAIL model](https://web.dev/rail/)）の1/4を目標とする。これにより、ボタンクリックから即座にパネルが表示され始める。

3. **アニメーション 250ms**: Material Designのガイダンス（[Duration and easing](https://material.io/design/motion/speed.html)）に基づき、中サイズの要素の標準的な遷移時間として設定。ユーザーが視覚的な変化を認識しつつ、待ち時間を感じない適切なバランス。

### 3. アクセシビリティ検証

```bash
# axe DevTools拡張機能を使用
# または
npm run test:a11y
```

**チェック項目:**
- [ ] role="complementary" 設定
- [ ] aria-label, aria-hidden 設定
- [ ] キーボード操作: Tab, Shift+Tab, Escape
- [ ] スクリーンリーダー: NVDA/JAWSで読み上げ確認

---

## 📝 将来の拡張（フェーズ2以降、本プラン外）

### フェーズ2: 商品編集ページ

**前提条件:**
- 商品詳細ページにタグ編集モーダルが実装されている

**実装内容:**
- タグ編集モーダル表示時に `mode="sidepanel"` を指定
- `useGuidelineFirstVisit('edit')` で別キー管理

### フェーズ3: 追加機能検討

1. **パネル幅のカスタマイズ**
   - ドラッグでリサイズ
   - LocalStorageで幅を保存

2. **ピン留め機能**
   - パネルを常に開いた状態に固定
   - LocalStorageで設定保存

3. **キーボードショートカット**
   - `Ctrl+/` でパネルトグル
   - `Ctrl+1` でratingタブ、`Ctrl+2` でcategoriesタブ

---

## ✅ 完了条件

### フェーズ1完了の定義

- [ ] `GuidelineSidePanel.tsx` 作成完了
- [ ] `useGuidelineFirstVisit.ts` 作成完了
- [ ] `GuidelineContainer.tsx` 拡張完了
- [ ] `/register-item` でサイドパネルが正常に動作
- [ ] デスクトップ(1024px以上)でサイドパネル表示
- [ ] タブレット/モバイル(1023px以下)でシート表示
- [ ] 初回訪問時のみサイドパネルが開いた状態
- [ ] 2回目以降はクリック時に遅延マウント
- [ ] すべてのテストケースが通過
- [ ] アクセシビリティチェック完了
- [ ] コードレビュー完了

---

## 📚 重要ファイル一覧

### 新規作成

- `src/components/guidelines/GuidelineSidePanel.tsx`
- `src/hooks/useGuidelineFirstVisit.ts`

### 修正

- `src/components/guidelines/GuidelineContainer.tsx`
- `src/app/register-item/page.tsx` または関連コンポーネント

### 参照（既存）

- `src/components/guidelines/GuidelineDialog.tsx`
- `src/components/guidelines/GuidelineSheet.tsx`
- `src/components/guidelines/RatingFlowchart.tsx`
- `src/components/guidelines/RatingFlowchartDiagram.tsx`
- `src/components/guidelines/TagCategoryVisualizer.tsx`
- `src/data/guidelines/types.ts`

---

**作成日**: 2026-01-08
**最終更新**: 2026-01-08
**ステータス**: ✅ 仕様確定済み - 実装準備完了
**見積もり工数**: 4-6時間（コーディング3-4h、テスト1-2h）
