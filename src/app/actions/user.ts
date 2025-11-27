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
