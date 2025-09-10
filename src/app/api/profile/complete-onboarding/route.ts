import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        onboardingCompleted: true,
      },
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error("[COMPLETE_ONBOARDING_POST]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
