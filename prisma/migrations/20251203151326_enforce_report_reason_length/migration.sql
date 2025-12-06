/*
  Warnings:

  - You are about to alter the column `reason` on the `Report` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(1000)`.

*/
-- AlterTable
ALTER TABLE "Report" ALTER COLUMN "reason" SET DATA TYPE VARCHAR(1000);
