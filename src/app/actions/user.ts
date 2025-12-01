"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateSafeSearchSetting(isEnabled: boolean) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { isSafeSearchEnabled: isEnabled },
    });

    revalidatePath("/");
    revalidatePath("/profile");
    revalidatePath("/search");
    
    return { success: true };
  } catch (error) {
    console.error("Failed to update safe search setting:", error);
    return { success: false, error: "Failed to update setting" };
  }
}

export async function deleteAccount() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Delete linked accounts (OAuth)
      await tx.account.deleteMany({
        where: { userId: session.user.id },
      });

      // 2. Delete sessions
      await tx.session.deleteMany({
        where: { userId: session.user.id },
      });

      // 3. Anonymize user data
      // We use a random string for email to satisfy unique constraint
      const randomString = Math.random().toString(36).substring(2, 15);
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          name: "Deleted User",
          email: `deleted-${session.user.id}-${randomString}@example.com`,
          image: null,
          status: "DELETED",
          // Keep other fields as is to preserve history/integrity
        },
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to delete account:", error);
    return { success: false, error: "Failed to delete account" };
  }
}
