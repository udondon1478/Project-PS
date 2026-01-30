-- AlterTable
ALTER TABLE "AvatarItem" ADD COLUMN     "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[];
