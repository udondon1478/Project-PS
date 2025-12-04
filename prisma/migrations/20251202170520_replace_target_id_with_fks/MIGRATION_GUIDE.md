# マイグレーションガイド: 重複レポートの検出と解消

このマイグレーション（`20251202170520_replace_target_id_with_fks`）では、`Report`テーブルに新たなユニーク制約（`reporterId` と `tagId`/`productTagId`/`productId` の組み合わせ）が追加されます。
現在、`targetId` と `targetType` を使用してデータを管理している場合、移行時に重複データが存在するとマイグレーションが失敗する可能性があります。

本ガイドでは、マイグレーション適用前に重複データを検出し、安全に解消する手順を説明します。

> [!IMPORTANT]
> このマイグレーションファイルはデフォルトで `targetId` カラムを削除します。データを `tagId` 等の新カラムに移行する場合は、`migration.sql` を編集してデータ移行用のSQL（`UPDATE`文など）を `DROP COLUMN "targetId"` の前に追加する必要があります。

## 1. 重複の検出 (Detection)

以下のSQLクエリを実行して、各ユニーク制約に違反する可能性のある重複データを確認してください。

### A. Tag Report (`reporterId` + `tagId`) の重複

```sql
SELECT "reporterId", "targetId" AS "tagId", COUNT(*) as "count"
FROM "Report"
WHERE "targetType" = 'TAG'
GROUP BY "reporterId", "targetId"
HAVING COUNT(*) > 1;
```

### B. Product Tag Report (`reporterId` + `productTagId`) の重複

```sql
SELECT "reporterId", "targetId" AS "productTagId", COUNT(*) as "count"
FROM "Report"
WHERE "targetType" = 'PRODUCT_TAG'
GROUP BY "reporterId", "targetId"
HAVING COUNT(*) > 1;
```

### C. Product Report (`reporterId` + `productId`) の重複

```sql
SELECT "reporterId", "targetId" AS "productId", COUNT(*) as "count"
FROM "Report"
WHERE "targetType" = 'PRODUCT'
GROUP BY "reporterId", "targetId"
HAVING COUNT(*) > 1;
```

## 2. 重複の解消 (Cleanup)

重複が見つかった場合、以下のスクリプトを使用して解消します。
このスクリプトは**冪等性（Idempotent）**があり、何度実行しても安全です。
重複グループの中で、`createdAt` が最も新しい（最新の）レポートを1つ残し、それ以外を削除します。

```sql
WITH Duplicates AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY "reporterId", "targetType", "targetId" 
            ORDER BY "createdAt" DESC
        ) as rn
    FROM "Report"
)
DELETE FROM "Report"
WHERE id IN (
    SELECT id FROM Duplicates WHERE rn > 1
);
```

*※ 古いレポートを残したい場合は `ORDER BY "createdAt" ASC` に変更してください。*

## 3. 実行手順 (Procedure)

本番環境への適用は以下の手順で行うことを推奨します。

1.  **データベースのバックアップを取得する**
2.  **検出クエリ（Step 1）を実行する**
    *   重複がない場合 → 手順4へ進む
3.  **解消スクリプト（Step 2）を実行する**
    *   メンテナンスウィンドウ内での実行を推奨します。
    *   実行後、再度検出クエリを実行して重複が0件になったことを確認してください。
4.  **マイグレーションを適用する**
    ```bash
    npx prisma migrate deploy
    ```

## 4. ロールバックと再実行 (Rollback & Retry)

万が一、インデックス作成に失敗した場合や、手動でやり直す必要がある場合のSQLコマンドです。

### インデックス作成の再試行

もしマイグレーションが失敗し、インデックスが作成されなかった場合は、重複を解消した後に以下のコマンドで手動作成できます。

```sql
-- Tag Report Index
CREATE UNIQUE INDEX CONCURRENTLY "Report_reporterId_tagId_key" 
ON "Report"("reporterId", "tagId");

-- Product Tag Report Index
CREATE UNIQUE INDEX CONCURRENTLY "Report_reporterId_productTagId_key" 
ON "Report"("reporterId", "productTagId");

-- Product Report Index
CREATE UNIQUE INDEX CONCURRENTLY "Report_reporterId_productId_key" 
ON "Report"("reporterId", "productId");
```

### ロールバック（インデックス削除）

作成されたインデックスを削除する場合：

```sql
DROP INDEX IF EXISTS "Report_reporterId_tagId_key";
DROP INDEX IF EXISTS "Report_reporterId_productTagId_key";
DROP INDEX IF EXISTS "Report_reporterId_productId_key";
```
