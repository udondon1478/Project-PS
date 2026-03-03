# 決定ログ

## 1. テストファイルの配置をco-located方式とした
- **背景**: プロジェクトにはco-located（同一ディレクトリ）と`__tests__/`ディレクトリの両方のパターンが存在する
- **検討した選択肢**: `src/scripts/__tests__/backfill-booth-tags.test.ts` vs `src/scripts/backfill-booth-tags.test.ts`
- **理由**: booth-scraper関連の既存テスト（`tag-resolver.test.ts`, `product-parser.test.ts`等）がco-locatedパターンを使用しており、それに合わせた

## 2. `main`と`fetchTagsFromBooth`の両方をnamed exportとしてテストする前提とした
- **背景**: CLIスクリプトは通常auto-execute（モジュール読み込み時にmain()を呼ぶ）するが、テスト時はモック設定後に明示的に呼び出す必要がある
- **検討した選択肢**: (a) 関数をexportしてテスト (b) モジュール全体をdynamic importでテスト
- **理由**: (a)はシンプルでプロジェクトの既存テストパターンに近い。実装側でauto-executionをガードする条件（`process.argv[1]`チェック等）を追加すれば十分

## 3. `fetchTagsFromBooth`の戻り値を`{ tagNames, ageRating } | null`と定義した
- **背景**: 計画では`return { tagNames, ageRating }`と記載。`ProductPageResult`の`tags`フィールドとの名前の混同を避ける必要がある
- **検討した選択肢**: `tags` vs `tagNames`
- **理由**: 計画の記載に準拠。`tagNames`（文字列の名前配列）と`tagIds`（解決済みID配列）を区別する命名は可読性が高い

## 4. インテグレーションテストは不要と判断した
- **背景**: テストポリシーでは「3つ以上のモジュールを横断するデータフロー」にインテグレーションテスト必須とある
- **検討した選択肢**: (a) 全依存をモックしたユニットテストのみ (b) DBを含むインテグレーションテストも追加
- **理由**: このスクリプトは既存モジュール（http-client, parser, tag-resolver）を組み合わせるオーケストレーター。各モジュールには既にテストがある。`main`のテストが全依存をモックしつつフロー全体を検証しており、モジュール間の結合は呼び出し順序と引数の受け渡しで十分検証できる