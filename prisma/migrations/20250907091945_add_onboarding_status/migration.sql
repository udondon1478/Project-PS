-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "onboarding_booth_registration_completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboarding_product_detail_completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboarding_search_completed" BOOLEAN NOT NULL DEFAULT false;
