---
name: fix_coderabbit
description: CodeRabbitのレビュー指摘を取得し、AIを使用して自動修正を行い、解決マークをつけてプッシュするスキル
---

# CodeRabbit Review Auto-Fix Skill

このスキルは、GitHubのPull Requestに対してCodeRabbitが行ったレビュー指摘を自動的に分析・修正し、解決済みにすることを目的としています。

## 手順

以下の手順に従って実行してください。

### 1. 情報収集

ユーザーから提供されたPull RequestのIDと以下の情報を組み合わせて下さい。
- **Owner**: udondon1478
- **Repo**: Project-PS
- **Pull Request Number**: (必須)

### 2. レビューコメントの取得

`mcp` ツールを使用して、CodeRabbitからのレビュー情報を取得します。
- ツール: `mcp_coderabbit_get_review_comments`
- 補助ツール: `mcp_coderabbit_get_comment_details`（必要に応じて）
- 引数: `owner`, `repo`, `pullNumber`

取得したコメントの中から、未解決（`unresolved`）のものだけを対象とします。

### 3. 指摘の分析と修正（ループ処理）

取得した各未解決コメントについて、以下の処理を繰り返してください。

1.  **詳細情報の確認**:
    必要に応じて `mcp_coderabbit_get_comment_details` を呼び出し、コメントの全文と「AI向けプロンプト (Prompt for AI Agents)」を取得してください。

2.  **修正要否の判断**:
    - **判断基準**:
        - CodeRabbitの指摘（人間向けコメント）が妥当か？
        - ソースコードの現状と照らし合わせて、修正が必要か？
    - **人間の介入**: 判断に迷う場合や、クリティカルな変更に見える場合は、ユーザーに確認を求めてください。

3.  **コード修正の実行 (修正が必要な場合)**:
    - **主な指示書**: CodeRabbitが提供する「AI向けプロンプト」の内容に従ってください。
    - **補足**: 人間向けのコメントにある背景情報も考慮してください。
    - ツール: `replace_file_content` や `multi_replace_file_content` などを使用してファイルを編集します。

4.  **コメントの解決 (Resolve)**:
    - ツール: `mcp_coderabbit_resolve_comment`
    - **修正した場合**: `resolution: "addressed"`
    - **修正不要と判断した場合**: `resolution: "wont_fix"` または `resolution: "not_applicable"` (理由を `note` に記載すること)

### 4. 変更の反映

全てのコメント処理が完了したら、変更をリポジトリに反映します。

1.  **コミット**: 変更内容に合わせて適切なコミットメッセージを作成してください（例: `fix: CodeRabbitレビュー指摘の修正`）。
2.  **プッシュ**: `mcp_github-mcp-server_push_files` (または `git push`) を使用して変更をリモートブランチにプッシュしてください。

## 注意事項

- ユーザーからの明示的な指示（「この指摘は無視して」など）がある場合は、それに従ってください。
