-- CreateTable
CREATE TABLE "public"."OnboardingState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tourKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OnboardingState_userId_idx" ON "public"."OnboardingState"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingState_userId_tourKey_key" ON "public"."OnboardingState"("userId", "tourKey");

-- AddForeignKey
ALTER TABLE "public"."OnboardingState" ADD CONSTRAINT "OnboardingState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
