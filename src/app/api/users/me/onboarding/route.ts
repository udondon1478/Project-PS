import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

type TourName = 'search' | 'productDetail' | 'boothRegistration';

const tourNameToColumnMap: Record<TourName, string> = {
  search: 'onboarding_search_completed',
  productDetail: 'onboarding_product_detail_completed',
  boothRegistration: 'onboarding_booth_registration_completed',
};

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { tourName } = (await req.json()) as { tourName: TourName };

  if (!tourName || !Object.keys(tourNameToColumnMap).includes(tourName)) {
    return NextResponse.json({ error: 'Invalid tour name provided.' }, { status: 400 });
  }

  const columnToUpdate = tourNameToColumnMap[tourName];

  try {
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        [columnToUpdate]: true,
      },
    });
    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error(`Error updating onboarding status for tour "${tourName}":`, error);
    return NextResponse.json({ error: 'An unexpected error occurred while updating onboarding status.' }, { status: 500 });
  }
}
