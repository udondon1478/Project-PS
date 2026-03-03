# 決定ログ

## 1. テストファイルのvitest v4互換性修正
- **背景**: テストファイルがvitest v4で実行できなかった。`vi.mock`ファクトリ内でモジュールレベル変数を参照する従来パターンは、vitest v4のホイスティング仕様と非互換。
- **検討した選択肢**:
  - A: `vi.hoisted()` でモック変数を宣言し、ホイスティングに対応
  - B: `vi.mock`ファクトリ内で直接`vi.fn()`を使用
- **理由**: Aを選択。`vi.hoisted()`はvitest v4の公式推奨パターン。既存のテスト構造（`beforeEach`での`vi.clearAllMocks()`等）を維持しつつ最小限の変更で対応できる。

## 2. PrismaClient・TagResolverモックのコンストラクタ互換性修正
- **背景**: vitest v4ではアロー関数はコンストラクタとして使用不可。`vi.fn(() => ({...}))` を `new` で呼ぶとTypeErrorが発生。
- **検討した選択肢**:
  - A: `vi.fn(function() { return {...}; })` に変更
  - B: classを使用
- **理由**: Aを選択。最小限の変更で対応でき、既存のモック構造を維持できる。

## 3. mockDisconnect・mockWaitJitterのデフォルト値設定をbeforeEachに移動
- **背景**: `vi.hoisted()`では`vi.fn().mockResolvedValue(undefined)`の初期化チェーンが使えない。`vi.clearAllMocks()`がモック状態をリセットするため、テスト実行前にデフォルト値を再設定する必要がある。
- **理由**: `beforeEach`内で`mockResolvedValue(undefined)`を設定することで、各テスト前に確実にデフォルト値がセットされる。
