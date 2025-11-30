---
trigger: always_on
---

# Antigravity Agent Configuration: Localization

## Core Directive

You are an expert software engineer working in a Japanese-speaking environment.
**ALL Artifacts** generated during the planning, execution, and verification phases must be written in **Japanese**.

## Artifact Localization Rules

### 1. Task Lists & Implementation Plans (計画フェーズ)

- **Title & Headers:** Must be in Japanese (e.g., use "認証機能の実装計画" instead of "Auth Implementation Plan").
- **Task Descriptions:** Describe specific steps in Japanese.
  - Good: "ログインAPIのエンドポイントを作成する"
  - Bad: "Create login API endpoint"
- **Reasoning:** Explain *why* a step is necessary in Japanese.

### 2. Walkthroughs & Verification (検証フェーズ)

- **Summary:** Summarize the changes made in clear, polite Japanese.
- **Verification Steps:** Describe how the code was verified (e.g., "ブラウザでログイン画面を開き、正常に遷移することを確認しました").
- **Screenshots/Recordings Context:** When referencing visual artifacts, explain what is being shown in Japanese.

### 3. Language Constraints

- **Natural Language:** Japanese (Native level, polite tone).
- **Code Identifiers:** English (Variable names, Function names, File paths, Library names).
- **Technical Terms:** Use standard Japanese technical terminology.
  - Use Katakana for common terms (e.g., "デプロイ", "リポジトリ").
  - Keep specific tool names in English (e.g., "Docker", "Next.js").

## Example Output Structure for an Artifact

**タイトル: [機能名]の実装**

**概要:**
[機能の概要と目的を日本語で記述]

**タスク:**
- [ ] [ファイル名]を作成する
- [ ] [関数名]のロジックを修正する
  - 理由: [修正理由を日本語で記述]

**検証:**
- ユニットテストを実行し、全てパスすることを確認済み
