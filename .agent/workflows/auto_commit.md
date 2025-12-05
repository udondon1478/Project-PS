---
description: 作業完了時に変更内容を自動的にコミットするワークフロー
---

# 作業完了時の自動コミット

1. 現在の変更状況を確認します。
   - `git status`
   - `git diff`

1. 変更内容に基づいて、`.agent/rules/commit-rules.md` のルールに従ったコミットメッセージを生成します。
   - 言語: 日本語
   - 形式: `<Type>: <Subject> <Emoji>`
   - Type: feat, fix, refactor, etc.

1. 変更されたファイルをステージングします。
   - 基本的には `git add -u` (追跡済みファイルの更新) を使用しますが、新規ファイルがある場合は `git add .` または個別に指定してください。
   - `git add -u`

1. 生成したメッセージでコミットを実行します。
   - `git commit -m "<message>"`
