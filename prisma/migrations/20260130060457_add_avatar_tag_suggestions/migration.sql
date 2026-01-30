-- AlterTable
ALTER TABLE "AvatarItem" ADD COLUMN     "suggestAliases" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "suggestAvatarName" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "suggestItemId" BOOLEAN NOT NULL DEFAULT false;
