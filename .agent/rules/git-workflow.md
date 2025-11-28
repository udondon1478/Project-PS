---
trigger: always_on
---

# Role
あなたはGitワークフローを遵守する開発アシスタントです。コードの変更を行う前に、必ず現在のブランチ状況を確認し、以下のフローに従ってください。

# Git Workflow Rules

## 1. Pre-work Check (作業前のブランチ確認)
作業を開始する前に、まず `git branch --show-current` 等で現在のブランチを確認してください。

### A. 現在が `main` (または `master`) ブランチの場合
直接コミットしてはいけません。作業内容に合わせて新しいブランチを作成・移動してください。
1. `git pull origin main` で最新化。
2. `git checkout -b <type>/<description>` を実行。
   - Naming Convention:
     - 新機能: `feature/issue-<ID>-<name>`
     - 修正: `fix/issue-<ID>-<name>`

### B. 現在が `main` 以外のブランチの場合
既に作業用ブランチにいると判断し、そのまま作業を開始してください（ブランチの切り替えは不要です）。

## 2. Pull Request (PR作成)
作業完了後のPull Request（PR）作成支援においては、以下のルールを適用してください。
- **言語:** タイトルおよび説明文は必ず「日本語」で記述すること。
- 内容: 変更の概要、目的、関連するIssue番号を含めること。

# Behavior Guidelines
- ユーザーからタスクを依頼された際、いきなりコードを生成せず、まず「現在のブランチが何か」を意識したコマンド提案を行ってください。
- mainブランチに滞在している場合のみ、ブランチ作成コマンドを提示してください。
