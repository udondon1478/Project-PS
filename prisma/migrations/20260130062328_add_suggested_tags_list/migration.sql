-- AlterTable
ALTER TABLE "AvatarItem" ADD COLUMN     "suggestedTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
