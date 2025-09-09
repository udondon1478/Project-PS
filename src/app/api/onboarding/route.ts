import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const onboardingStates = await prisma.onboardingState.findMany({
      where: {
        userId: session.user.id,
      },
    });
    return NextResponse.json(onboardingStates);
  } catch (error) {
    console.error('Failed to fetch onboarding state:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tourKey, status } = body;

    if (!tourKey || typeof tourKey !== 'string' || !status || typeof status !== 'string') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const updatedState = await prisma.onboardingState.upsert({
      where: {
        userId_tourKey: {
          userId: session.user.id,
          tourKey,
        },
      },
      update: {
        status,
      },
      create: {
        userId: session.user.id,
        tourKey,
        status,
      },
    });

    return NextResponse.json(updatedState, { status: 200 });
  } catch (error) {
    console.error('Failed to update onboarding state:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
