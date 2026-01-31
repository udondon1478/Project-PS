-- CreateTable
CREATE TABLE "SearchFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchFavorite_userId_idx" ON "SearchFavorite"("userId");

-- CreateIndex
CREATE INDEX "SearchFavorite_createdAt_idx" ON "SearchFavorite"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SearchFavorite_userId_name_key" ON "SearchFavorite"("userId", "name");

-- AddForeignKey
ALTER TABLE "SearchFavorite" ADD CONSTRAINT "SearchFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
