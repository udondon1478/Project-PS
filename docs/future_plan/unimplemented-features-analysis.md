# 未実装機能分析レポート

**作成日**: 2026年1月3日
**対象サイト**: www.sankakucomplex.com
**分析対象リポジトリ**: PolySeek v2 (ui-ux-enhancement ブランチ)

## 概要

このドキュメントは、画像ボードサイト（Sankaku Complex、Danbooru、Gelbooruなど）に一般的に存在する機能のうち、現在のPolySeekリポジトリに未実装の機能を体系的に分析したものです。

## 調査方法

1. **データベーススキーマ分析**: `prisma/schema.prisma` を詳細に調査
2. **コンポーネント分析**: タグ管理・ユーザー関連のReactコンポーネントを確認
3. **API エンドポイント分析**: `src/app/api/**/*.ts` を調査
4. **一般的な画像ボードサイト機能との比較**: 業界標準機能と照合

---

## 📌 タグ管理機能

### 1. タグのお気に入り・ブックマーク機能
- **ステータス**: ❌ 未実装
- **説明**: ユーザーが特定のタグをお気に入り登録し、素早くアクセスできるようにする
- **用途**:
  - よく使うタグをブックマーク
  - カスタムタグコレクションの作成
  - クイックアクセスメニューに表示
- **実装に必要なもの**:
  ```prisma
  model UserFavoriteTag {
    id        String   @id @default(cuid())
    userId    String
    tagId     String
    order     Int      @default(0) // 表示順序
    createdAt DateTime @default(now())

    user User @relation(fields: [userId], references: [id], onDelete: Cascade)
    tag  Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

    @@unique([userId, tagId])
    @@index([userId])
  }
  ```
- **参考実装**: Danbooru の "Favorite Tags" 機能

### 2. タグの購読（Subscribe/Follow）機能
- **ステータス**: ❌ 未実装
- **説明**: タグを購読して、そのタグが付いた新着商品の通知を受け取る
- **用途**:
  - 興味のあるタグの更新を自動追跡
  - 新着アイテムの通知
  - RSSフィード生成
- **実装に必要なもの**:
  ```prisma
  model TagSubscription {
    id        String   @id @default(cuid())
    userId    String
    tagId     String
    notifyEmail Boolean @default(true)
    notifyWeb   Boolean @default(true)
    createdAt DateTime @default(now())

    user User @relation(fields: [userId], references: [id], onDelete: Cascade)
    tag  Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

    @@unique([userId, tagId])
    @@index([userId])
    @@index([tagId])
  }
  ```
- **参考実装**: Pixiv の "フォロー中のタグ" 機能

### 3. タグのブロック/ミュート機能
- **ステータス**: ❌ 未実装
- **説明**: 特定のタグをブロックして検索結果やフィードから除外
- **用途**:
  - 興味のないコンテンツを非表示
  - カスタマイズされたブラウジング体験
  - セーフサーチの強化
- **実装に必要なもの**:
  ```prisma
  model UserBlockedTag {
    id        String   @id @default(cuid())
    userId    String
    tagId     String
    createdAt DateTime @default(now())

    user User @relation(fields: [userId], references: [id], onDelete: Cascade)
    tag  Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

    @@unique([userId, tagId])
    @@index([userId])
  }
  ```
- **参考実装**: Twitter の "ミュートワード" 機能

### 4. タグのマージ機能（管理者用）
- **ステータス**: ❌ 未実装
- **説明**: 重複タグや類似タグを統合する管理機能
- **用途**:
  - "avatar" と "avatars" などの重複を解消
  - タグの一貫性を維持
  - データベースのクリーンアップ
- **実装に必要なもの**:
  - 管理画面でのタグマージAPI (`POST /api/admin/tags/merge`)
  - 商品タグの一括更新ロジック
  - マージ履歴の記録
- **備考**: 現在は `aliases` 機能があるが、完全なマージ機能はない

### 5. タグの一括編集機能
- **ステータス**: ❌ 未実装
- **説明**: 複数商品のタグを一度に編集
- **用途**:
  - 効率的なタグ管理
  - 一括でのタグ追加・削除
  - 管理者によるメンテナンス作業の効率化
- **実装に必要なもの**:
  - バルク編集API (`POST /api/tags/bulk-edit`)
  - 選択した商品リストへのタグ操作
  - 編集履歴の記録

### 6. タグのサジェスト理由表示
- **ステータス**: 🟡 部分実装
- **現状**: タグサジェスト（`TagSearchBar.tsx`）はあるが、なぜそのタグが提案されるかの理由表示がない
- **改善案**:
  - "この商品によく使われています (使用回数: 120)"
  - "類似商品で使用されています"
  - "あなたが頻繁に使用しているタグです"
- **実装に必要なもの**:
  - サジェストAPIのレスポンスに理由フィールドを追加
  - UI上での理由の表示

### 7. タグの統計情報
- **ステータス**: ❌ 未実装
- **説明**: タグの使用トレンド、時系列での使用推移グラフ
- **用途**:
  - 人気タグの分析
  - トレンドの把握
  - データドリブンな意思決定
- **実装に必要なもの**:
  ```prisma
  model TagStatistics {
    id        String   @id @default(cuid())
    tagId     String
    date      DateTime // 日単位の統計
    useCount  Int      @default(0)
    viewCount Int      @default(0)

    tag Tag @relation(fields: [tagId], references: [id], onDelete: Cascade)

    @@unique([tagId, date])
    @@index([tagId, date])
  }
  ```
  - グラフ表示コンポーネント（Chart.js、Recharts など）

### 8. タグのウィキページ
- **ステータス**: 🟡 部分実装
- **現状**: `Tag.description` フィールドはあるが、詳細なウィキページ機能はない
- **改善案**:
  - リッチテキストエディタでの編集
  - 画像・リンクの埋め込み
  - バージョン管理（履歴は `TagMetadataHistory` で一部サポート）
  - マークダウンサポート
- **実装に必要なもの**:
  - リッチテキストエディタ（Tiptap、Slate など）
  - 画像アップロード機能
  - プレビュー機能

---

## 👤 ユーザー機能

### 1. ユーザープロフィール公開ページ
- **ステータス**: ❌ 未実装
- **現状**: `UserProductList.tsx` はあるが、公開プロフィールページがない
- **説明**: 他のユーザーがアクセスできるプロフィールページ
- **用途**:
  - ユーザーの投稿一覧表示
  - いいねした商品
  - 統計情報（投稿数、いいね数、貢献度など）
  - バッジ・実績の表示
- **実装に必要なもの**:
  - `/profile/[userId]` ページ
  - プロフィール情報のAPI (`GET /api/users/[userId]/profile`)
  - プライバシー設定（プロフィールの公開/非公開）

### 2. ユーザー間フォロー機能
- **ステータス**: ❌ 未実装
- **説明**: 他のユーザーをフォローして、その投稿を追跡
- **用途**:
  - フォローしたユーザーの新着投稿を表示
  - フォロワー・フォロー中リストの表示
  - ソーシャル機能の強化
- **実装に必要なもの**:
  ```prisma
  model UserFollow {
    id          String   @id @default(cuid())
    followerId  String   // フォローする側のユーザー
    followingId String   // フォローされる側のユーザー
    createdAt   DateTime @default(now())

    follower  User @relation("UserFollows", fields: [followerId], references: [id], onDelete: Cascade)
    following User @relation("UserFollowers", fields: [followingId], references: [id], onDelete: Cascade)

    @@unique([followerId, followingId])
    @@index([followerId])
    @@index([followingId])
  }
  ```

### 3. ユーザーランキング機能
- **ステータス**: ❌ 未実装
- **説明**: 投稿数、いいね数、タグ編集貢献度などによるランキング
- **用途**:
  - アクティブユーザーの表彰
  - コミュニティの活性化
  - 貢献度の可視化
- **ランキング項目案**:
  - 投稿数ランキング
  - いいね獲得数ランキング
  - タグ編集貢献度ランキング
  - タグ編集評価スコアランキング（`TagEditHistory.score`）
- **実装に必要なもの**:
  - 統計集計クエリ
  - ランキング表示ページ
  - 期間フィルタ（今日、今週、今月、全期間）

### 4. ユーザーバッジ・実績システム
- **ステータス**: ❌ 未実装
- **説明**: 貢献度に応じたバッジを自動付与
- **用途**:
  - ゲーミフィケーション
  - ユーザーエンゲージメント向上
  - モチベーション向上
- **バッジ例**:
  - "初投稿" - 最初の商品を登録
  - "タグマスター" - 100個以上のタグを編集
  - "人気者" - 100いいねを獲得
  - "ベテラン" - 登録から1年経過
- **実装に必要なもの**:
  ```prisma
  model Badge {
    id          String @id @default(cuid())
    name        String @unique
    description String
    icon        String // アイコンURL
    condition   String // 獲得条件（JSON形式など）

    userBadges UserBadge[]
  }

  model UserBadge {
    id        String   @id @default(cuid())
    userId    String
    badgeId   String
    earnedAt  DateTime @default(now())

    user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
    badge Badge @relation(fields: [badgeId], references: [id])

    @@unique([userId, badgeId])
    @@index([userId])
  }
  ```
  - バッジ判定ロジック（イベントベースまたはバッチ処理）

### 5. ユーザー通知システム
- **ステータス**: ❌ 未実装
- **説明**: いいね、フォロー、返信などの通知
- **用途**:
  - ユーザーアクティビティの追跡
  - エンゲージメントの向上
  - リアルタイムな情報提供
- **通知の種類**:
  - いいねされた
  - フォローされた
  - コメントされた
  - タグ編集が評価された
  - 購読中のタグに新着商品
- **実装に必要なもの**:
  ```prisma
  enum NotificationType {
    LIKE
    FOLLOW
    COMMENT
    TAG_EDIT_VOTE
    TAG_SUBSCRIPTION_NEW_ITEM
    SYSTEM
  }

  model Notification {
    id        String           @id @default(cuid())
    userId    String
    type      NotificationType
    title     String
    message   String
    link      String?          // 通知をクリックした時の遷移先
    isRead    Boolean          @default(false)
    createdAt DateTime         @default(now())

    user User @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@index([userId, isRead])
    @@index([createdAt])
  }
  ```
  - リアルタイム通知（WebSocket、Server-Sent Events など）
  - 通知センターUI

### 6. ユーザーのアップロード履歴
- **ステータス**: 🟡 部分実装
- **現状**: `UserProductList.tsx` はあるが、詳細なフィルタリングやソート機能がない
- **改善案**:
  - 日付範囲フィルタ
  - タグフィルタ
  - ソート（新しい順、古い順、いいね数順、閲覧数順）
  - 検索機能
  - 一括操作（削除、タグ編集など）

### 7. ユーザーのコメント・レビュー機能
- **ステータス**: ❌ 未実装
- **説明**: 商品へのコメントやレビューを投稿
- **用途**:
  - ユーザー間のコミュニケーション
  - 商品の品質フィードバック
  - Q&A
- **実装に必要なもの**:
  ```prisma
  model ProductComment {
    id        String   @id @default(cuid())
    productId String
    userId    String
    content   String   @db.Text
    parentId  String?  // 返信機能用
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
    user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
    parent  ProductComment?  @relation("CommentReplies", fields: [parentId], references: [id])
    replies ProductComment[] @relation("CommentReplies")

    @@index([productId])
    @@index([userId])
    @@index([parentId])
  }
  ```
  - コメント表示UI
  - 通報機能（既存の `Report` モデルを拡張）

### 8. ユーザーのプライベートメッセージ（DM）
- **ステータス**: ❌ 未実装
- **説明**: ユーザー間のダイレクトメッセージ
- **用途**:
  - 個別のコミュニケーション
  - 取引の相談
  - 非公開での情報交換
- **実装に必要なもの**:
  ```prisma
  model Message {
    id         String   @id @default(cuid())
    senderId   String
    receiverId String
    content    String   @db.Text
    isRead     Boolean  @default(false)
    createdAt  DateTime @default(now())

    sender   User @relation("SentMessages", fields: [senderId], references: [id], onDelete: Cascade)
    receiver User @relation("ReceivedMessages", fields: [receiverId], references: [id], onDelete: Cascade)

    @@index([senderId])
    @@index([receiverId])
    @@index([receiverId, isRead])
  }
  ```
  - メッセージングUI
  - リアルタイム配信
  - スパム対策

### 9. ユーザーのコレクション/プール機能
- **ステータス**: ❌ 未実装
- **説明**: 商品を整理してテーマ別のコレクションを作成
- **用途**:
  - カスタムプレイリスト作成（「お気に入りアバター」「冬の衣装」など）
  - キュレーション
  - 共有可能なコレクション
- **実装に必要なもの**:
  ```prisma
  model Collection {
    id          String   @id @default(cuid())
    userId      String
    name        String
    description String?  @db.Text
    isPublic    Boolean  @default(false)
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt

    user  User             @relation(fields: [userId], references: [id], onDelete: Cascade)
    items CollectionItem[]

    @@index([userId])
    @@index([isPublic])
  }

  model CollectionItem {
    id           String   @id @default(cuid())
    collectionId String
    productId    String
    order        Int      @default(0)
    note         String?  @db.Text // アイテムごとのメモ
    addedAt      DateTime @default(now())

    collection Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
    product    Product    @relation(fields: [productId], references: [id], onDelete: Cascade)

    @@unique([collectionId, productId])
    @@index([collectionId, order])
  }
  ```
- **参考実装**: Pixiv の "ブックマーク コレクション" 機能

### 10. ユーザーのAPIキー発行
- **ステータス**: ❌ 未実装
- **説明**: 外部アプリケーション連携用のAPIキーを発行
- **用途**:
  - サードパーティアプリからのアクセス
  - 自動化スクリプト
  - モバイルアプリ連携
- **実装に必要なもの**:
  ```prisma
  model ApiKey {
    id          String   @id @default(cuid())
    userId      String
    name        String   // キーの識別名
    key         String   @unique // 実際のAPIキー（ハッシュ化）
    permissions String[] // 許可するスコープ
    lastUsedAt  DateTime?
    expiresAt   DateTime?
    createdAt   DateTime @default(now())

    user User @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@index([userId])
    @@index([key])
  }
  ```
  - API認証ミドルウェア
  - キー管理UI

---

## 🔍 検索・フィルタリング機能

### 1. 高度な検索オプション
- **ステータス**: 🟡 部分実装
- **現状**: タグ検索（`TagSearchBar.tsx`）はあるが、以下が未実装：

#### 未実装の検索オプション：
- **アップロード日範囲指定**
  - 「過去1週間」「過去1ヶ月」「カスタム範囲」
- **価格範囲指定**
  - 最低価格〜最高価格のスライダー
  - 「無料のみ」フィルタ
- **ファイルサイズ/解像度フィルタ**
  - 画像サイズでのフィルタリング
- **販売者フィルタ**
  - 特定の販売者の商品のみ表示
- **並び替えオプション**
  - 現在: DATEのみ
  - 追加候補: 人気順（いいね数）、閲覧数順、価格順、レビュー評価順

### 2. 保存された検索クエリ
- **ステータス**: ❌ 未実装
- **説明**: よく使う検索条件を保存して再利用
- **用途**:
  - 繰り返し使う検索の効率化
  - カスタム検索の管理
- **実装に必要なもの**:
  ```prisma
  model SavedSearch {
    id        String   @id @default(cuid())
    userId    String
    name      String
    query     String   @db.Text // JSON形式で検索条件を保存
    createdAt DateTime @default(now())

    user User @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@index([userId])
  }
  ```

---

## 📊 その他の機能

### 1. 商品の評価システム（レーティング）
- **ステータス**: ❌ 未実装
- **現状**: いいね（`ProductLike`）のみ
- **説明**: 星評価や数値評価システム
- **用途**:
  - 商品の品質評価
  - レビュースコアの表示
  - 高評価商品のフィルタリング
- **実装に必要なもの**:
  ```prisma
  model ProductRating {
    id        String   @id @default(cuid())
    productId String
    userId    String
    rating    Int      // 1-5 stars
    review    String?  @db.Text // オプショナルなレビュー文
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
    user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@unique([productId, userId])
    @@index([productId])
    @@index([userId])
  }
  ```

### 2. 商品のダウンロード履歴
- **ステータス**: ❌ 未実装
- **説明**: ダウンロード回数の追跡
- **用途**:
  - 人気商品の把握
  - 統計分析
  - トレンド追跡
- **実装に必要なもの**:
  ```prisma
  model ProductDownload {
    id          String   @id @default(cuid())
    productId   String
    userId      String?  // 匿名ダウンロードの場合はnull
    ipAddress   String?
    userAgent   String?
    downloadedAt DateTime @default(now())

    product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
    user    User?   @relation(fields: [userId], references: [id], onDelete: SetNull)

    @@index([productId])
    @@index([userId])
    @@index([downloadedAt])
  }
  ```
- **備考**: 既存の `ProductView` モデルと類似

### 3. 関連商品のレコメンデーション
- **ステータス**: ❌ 未実装
- **説明**: タグベースの類似商品推薦
- **用途**:
  - ユーザー体験の向上
  - 商品の発見性向上
  - エンゲージメント向上
- **実装方法**:
  - タグの類似度計算（共通タグ数、含意関係を考慮）
  - 協調フィルタリング（同じ商品をいいねしたユーザーの他のいいね）
  - ユーザーの閲覧履歴に基づく推薦
- **実装に必要なもの**:
  - レコメンデーションアルゴリズム
  - API エンドポイント (`GET /api/products/[productId]/recommendations`)
  - キャッシング機構

---

## ✅ 既に実装されている主要機能

### タグ管理
- ✅ タグの基本管理（名前、説明、カテゴリ、displayName）
- ✅ タグ階層構造（親子関係、`TagHierarchy`）
- ✅ タグ含意関係（`TagImplication`）
- ✅ タグ翻訳（`TagTranslation`）
- ✅ タグエイリアス（`Tag.isAlias`, `Tag.canonicalId`）
- ✅ タグ編集履歴（`TagEditHistory`）
- ✅ タグ編集評価・投票（`TagEditVote`）
- ✅ タグメタデータ編集履歴（`TagMetadataHistory`）
- ✅ タグ詳細モーダル（`TagDetailModal.tsx`）
- ✅ タグ検索とサジェスト（`TagSearchBar.tsx`、displayName対応）
- ✅ マイナス検索機能
- ✅ タグの通報機能（`Report`）

### ユーザー管理
- ✅ ユーザー認証（NextAuth.js、OAuth）
- ✅ ユーザーロール（USER、ADMIN）
- ✅ ユーザーステータス（ACTIVE、SUSPENDED、DELETED）
- ✅ 疑わしいユーザー検出（`isSuspicious`、`suspicionReason`）
- ✅ ユーザー管理画面（`UserManagement.tsx`）
- ✅ セーフサーチ設定（`isSafeSearchEnabled`）
- ✅ アカウント削除機能（論理削除、`deleteAccount`）
- ✅ 利用規約同意（`termsAgreedAt`）

### 商品管理
- ✅ 商品登録（タイトル、説明、価格、画像、バリエーション）
- ✅ 商品画像（`ProductImage`、複数画像、順序管理）
- ✅ 商品バリエーション（`ProductVariation`）
- ✅ 商品所有者（`ProductOwner`）
- ✅ いいね機能（`ProductLike`）
- ✅ 閲覧履歴（`ProductView`）
- ✅ 商品の通報機能（`Report`）

### その他
- ✅ BOOTHスクレイパー（`ScraperRun`、`ScraperLog`、`ScraperTargetTag`、`ScraperConfig`）
- ✅ 販売者管理（`Seller`）
- ✅ 通報システム（タグ、商品タグ、商品、`Report`）

---

## 📈 優先度別実装推奨順位

### 🔴 高優先度（ユーザーエクスペリエンスの大幅改善）
1. **タグのお気に入り・ブックマーク機能**
2. **ユーザープロフィール公開ページ**
3. **高度な検索オプション（日付範囲、価格範囲）**
4. **商品の評価システム（レーティング）**
5. **ユーザー通知システム**

### 🟡 中優先度（コミュニティ機能の強化）
6. **ユーザー間フォロー機能**
7. **ユーザーのコメント・レビュー機能**
8. **タグの購読（Subscribe）機能**
9. **タグのブロック/ミュート機能**
10. **ユーザーのコレクション/プール機能**

### 🟢 低優先度（付加価値機能）
11. **ユーザーバッジ・実績システム**
12. **ユーザーランキング機能**
13. **関連商品のレコメンデーション**
14. **タグの統計情報**
15. **ユーザーのプライベートメッセージ（DM）**
16. **タグのウィキページ強化**
17. **保存された検索クエリ**
18. **商品のダウンロード履歴**
19. **タグの一括編集機能**
20. **ユーザーのAPIキー発行**

### ⚙️ 管理者向け機能
21. **タグのマージ機能**

---

## 🎯 次のステップ

1. **要件定義**: 実装する機能の優先順位を決定
2. **設計**: データベーススキーマの更新、API設計
3. **実装**: フロントエンドとバックエンドの開発
4. **テスト**: E2Eテスト、ユニットテスト
5. **デプロイ**: 段階的なロールアウト

---

## 📝 備考

- このリポジトリは既に**非常に高度なタグ管理システム**を実装しており、業界標準を超える機能も含まれています（タグ編集履歴、投票システムなど）
- **ユーザー間のソーシャル機能**（フォロー、コメント、コレクション、DM）が主な未実装領域です
- **検索・フィルタリング機能**の強化も大きな改善ポイントです

---

**このドキュメントは定期的に更新されます。最終更新: 2026年1月3日**
