---
description: CodeRabbitのレビューコメントを自動修正するワークフロー
---

# CodeRabbitのレビューコメント自動修正ワークフロー

ユーザーからPR番号（例: PR#196）が提供された場合、以下の手順を実行してください。

1. **レビューコメントの取得**
   - `mcp_coderabbit_get_review_comments` ツールを使用して、指定されたPRの全レビューコメントを取得します。
   - 引数: `owner`, `repo`, `pullNumber`

2. **未解決コメントのフィルタリング**
   - 取得したコメントリストから、以下の条件に一致するものを抽出します：
     - `is_resolved` フィールドが `false` であること。
   - ※ `is_resolved` が `true` のものは既に対応済みのため無視します。

3. **個別の修正タスク実行（ループ処理）**
   - 未解決のコメントが残っている場合、優先度の高いものから順に以下の手順を繰り返します。

   **A. 詳細確認**
   - 必要であれば `mcp_coderabbit_get_comment_details` でAIの修正提案や詳細を取得します。

   **B. タスク設定**
   - `task_boundary` を呼び出し、個別の修正タスクを開始します。
     - TaskName: CodeRabbit指摘対応 (PR#xxx)
     - TaskStatus: コメントID xxx の修正を実施中

   **C. 修正の実施**
   - ファイル内容を確認し (`view_file`), 指摘内容に応じた修正を行います。
   - 修正後は必要に応じてテストやLintを実行し、問題ないことを確認します。

   **D. 解決済みマーク**
   - 修正完了後、`mcp_coderabbit_resolve_comment` ツールを使用してコメントを解決済みに変更します。
     - `resolution`: "addressed"
     - `note`: "修正しました" 等のコメントを付記

4. **完了確認**
   - 全ての未解決コメントが処理されたら、ユーザーに完了を報告します。

