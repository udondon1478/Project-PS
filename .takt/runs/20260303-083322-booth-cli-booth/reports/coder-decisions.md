# 決定ログ

## 1. テストファイルのvitest v4互換性修正（vi.hoisted導入）
- **背景**: テストファイルが`vi.mock`ファクトリ内でモジュールレベル変数を参照する従来パターンを使用していたが、vitest v4のホイスティング仕様により`ReferenceError: Cannot access 'mockHttpFetch' before initialization`が発生し、テストが実行できなかった。
- **検討した選択肢**:
  - A: `vi.hoisted()`でモック変数を宣言し、ホイスティングに対応
  - B: `vi.mock`ファクトリ内で直接`vi.fn()`を使用し、外部変数への参照を排除
- **理由**: Aを選択。`vi.hoisted()`はvitest v4の公式推奨パターンであり、既存のテスト構造（`beforeEach`での`vi.clearAllMocks()`、各テストでの`mockOnce`設定等）を維持しつつ最小限の変更で対応できる。

## 2. PrismaClient・TagResolverモックのコンストラクタ互換性修正
- **背景**: vitest v4ではアロー関数はJavaScript仕様によりコンストラクタとして使用不可。`vi.fn(() => ({...}))`を`new`で呼ぶと`TypeError: ... is not a constructor`が発生。PrismaClientとTagResolverの両方で同じ問題が発生した。
- **検討した選択肢**:
  - A: `vi.fn(function() { return {...}; })`に変更（通常関数を使用）
  - B: classを使用してモックを定義
- **理由**: Aを選択。最小限の変更で対応でき、既存のモック構造を維持できる。vitest公式ドキュメントでも`function`キーワードの使用が推奨されている。

## 3. mockDisconnect・mockWaitJitterのデフォルト値設定をbeforeEachに移動
- **背景**: 元のテストでは`const mockDisconnect = vi.fn().mockResolvedValue(undefined)`のように初期化時にデフォルト値を設定していたが、`vi.hoisted()`内では`vi.fn()`の戻り値に対するメソッドチェーンが型互換性の問題を起こすため、初期化と値設定を分離する必要があった。また`vi.clearAllMocks()`がモック状態をリセットするため、テスト実行前にデフォルト値を再設定する必要がある。
- **検討した選択肢**:
  - A: `beforeEach`内で`mockResolvedValue(undefined)`を設定
  - B: `vi.hoisted()`内でメソッドチェーンを型アサーションで強制
- **理由**: Aを選択。`beforeEach`での設定は`vi.clearAllMocks()`の直後に実行されるため、各テストで確実にデフォルト値がセットされる。型アサーションによる強制より安全かつ明示的。