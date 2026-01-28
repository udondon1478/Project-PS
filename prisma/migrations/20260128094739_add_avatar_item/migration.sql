-- CreateTable
CREATE TABLE "AvatarItem" (
    "id" TEXT NOT NULL,
    "itemUrl" TEXT,
    "itemId" TEXT NOT NULL,
    "avatarName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvatarItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AvatarItem_itemId_key" ON "AvatarItem"("itemId");
