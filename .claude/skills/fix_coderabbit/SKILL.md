---
name: fix_coderabbit
description: CodeRabbitのレビュー指摘を取得し、AIを使用して自動修正を行い、解決マークをつけてプッシュするスキル
---

# CodeRabbit Review Auto-Fix Skill

このスキルは、GitHubのPull Requestに対してCodeRabbitが行ったレビュー指摘を自動的に分析・修正し、解決済みにすることを目的としています。

## 重要な原則

**CodeRabbitの指摘を鵜呑みにしない。** 各指摘について批判的に評価し、本当に修正が必要かを判断すること。

## 手順

以下の手順に従って実行してください。

### 1. 情報収集

ユーザーから提供されたPull RequestのIDと以下の情報を組み合わせて下さい。
- **Owner**: udondon1478
- **Repo**: Project-PS
- **Pull Request Number**: (必須)

### 2. レビューコメントの取得

GitHub CLIを使用して、CodeRabbitからのレビュー情報を取得します。

#### コメント取得コマンド

```bash
# CodeRabbitのレビューコメントを取得（JSONファイルに保存）
# インラインコメント、レビュー本文、Issueコメント（タイムライン）を全て取得して結合
{
  gh api --paginate repos/{owner}/{repo}/pulls/{pullNumber}/comments --jq '.[] | {id, path, line, body, type: "review_comment"}'
  gh api --paginate repos/{owner}/{repo}/pulls/{pullNumber}/reviews --jq '.[] | {id: .id, path: null, line: null, body, type: "review_summary"}'
  gh api --paginate repos/{owner}/{repo}/issues/{pullNumber}/comments --jq '.[] | {id, path: null, line: null, body, type: "issue_comment"}'
} | jq -s '[.[] | select(.user.login == "coderabbitai[bot]") | {id, path, line, body, type}]' > /tmp/coderabbit_comments.json
```

#### 重要な技術情報

- **CodeRabbitのユーザー名**: `coderabbitai[bot]`（`coderabbitai`ではない）
- **対応済みの判定**: コメント本文に `✅ Addressed` が含まれているかどうかで判断
- **ユーザー確認済みの判定**: コメント本文に `✅ Confirmed as addressed by @{username}` が含まれている場合

#### コメントのフィルタリング

```bash
# 対応状況を確認するクエリ
cat /tmp/coderabbit_comments.json | jq '.[] | {
  id,
  path,
  line,
  addressed: (.body | contains("✅ Addressed")),
  body_preview: (.body | split("\n")[0:3] | join(" | "))
}'
```

取得したコメントの中から、未解決（`addressed: false`）のものだけを対象とします。

### 3. 指摘の分類と優先度評価

各指摘を重要度で分類し、対応方針を決定します。

#### 重要度ラベルの識別

コメント本文の冒頭に以下のパターンで重要度が記載されています：

| パターン | 重要度 | 対応方針 |
|----------|--------|----------|
| `_⚠️ Potential issue_ \| _🟠 Major_` | Major | 慎重に検証。修正前に既存コードの動作確認が必要 |
| `_⚠️ Potential issue_ \| _🟡 Minor_` | Minor | 検証の上で修正を検討 |
| `_🧹 Nitpick_ \| _🔵 Trivial_` | Nitpick/Trivial | 費用対効果を考慮。`wont_fix` も選択肢 |

#### 特殊なコメントの識別

- **感謝・確認コメント**: `@{username}` で始まり、修正への感謝を述べているコメントは対応不要
- **Analysis chainコメント**: `<details><summary>🧩 Analysis chain</summary>` を含むコメントは詳細分析結果あり

### 4. 指摘の批判的評価（各指摘について）

修正を実行する**前に**、以下を確認してください。

1. **現状の動作確認**:
   - 元のコードでビルドは成功しているか？
   - 実際に問題が発生するシナリオは現実的か？

2. **CodeRabbitの主張の検証**:
   - Web検索結果やAI生成の情報を鵜呑みにしない
   - フレームワークのバージョン固有の主張は、プロジェクトの実際のバージョンで確認
   - 必要に応じて公式ドキュメントを参照

3. **修正の妥当性評価**:
   - 提案された修正は本質的な改善か、表面的な変更か？
   - コメント追加だけで済ませるより、コード構造の改善が適切ではないか？

4. **ユーザー確認が必要なケース**:
   - Major/Critical レベルの指摘
   - 既存の動作を変更する可能性がある修正
   - CodeRabbitの主張に疑問がある場合
   - 修正のROIが低いと思われる場合

### 5. コード修正の実行

**修正が必要と判断した場合のみ**実行します。

- **主な指示書**: CodeRabbitが提供する「AI向けプロンプト」の内容を参考にしつつ、批判的に評価
- **補足**: 人間向けのコメントにある背景情報も考慮
- ツール: `replace_file_content` や `multi_replace_file_content` などを使用

### 6. コメントの解決 (Resolve)

GitHubのPRレビューコメントは、GitHub UIからのみ解決可能です（APIからの直接解決は制限あり）。

修正をプッシュすることでCodeRabbitが自動的に「✅ Addressed」マークを追加します。

#### 解決状態の記録

処理結果のサマリーで以下の対応状態を記録してください：
- **addressed**: 修正を実施した
- **wont_fix**: 指摘は正しいが修正のROIが低い
- **not_applicable**: 指摘自体が不適切または誤り
- **already_addressed**: 既に対応済み（コメントに「✅ Addressed」あり）

### 7. 変更の反映

全てのコメント処理が完了したら、変更をリポジトリに反映します。

1. **コミット**: 変更内容に合わせて適切なコミットメッセージを作成
2. **プッシュ**: `git push` を使用して変更をリモートブランチにプッシュ

### 8. 処理結果のサマリー報告

ユーザーに以下を報告してください：

| 指摘 | 重要度 | 対応 | 理由 |
|------|--------|------|------|
| (各指摘) | Major/Nitpick等 | addressed/wont_fix等 | 判断理由 |

## 注意事項

- ユーザーからの明示的な指示（「この指摘は無視して」など）がある場合は、それに従ってください。
- **全ての指摘を機械的に修正しない。** 批判的評価を行い、必要な修正のみ実施すること。
- Nitpick指摘は積極的に `wont_fix` を検討すること。
