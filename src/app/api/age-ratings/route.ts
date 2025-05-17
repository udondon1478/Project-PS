import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const ageRatings = await prisma.ageRating.findMany();
    return NextResponse.json(ageRatings);
  } catch (error) {
    console.error('Error fetching age ratings:', error);
    return NextResponse.json({ message: 'Failed to fetch age ratings' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}