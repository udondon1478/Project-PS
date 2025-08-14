import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Regex to validate a 32-character hex string, case-insensitive
const gyazoIdRegex = /^[a-f0-9]{32}$/i;

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, gyazoUrl } = await req.json();

  // Validate name: must be a non-empty string
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Username cannot be empty.' }, { status: 400 });
  }

  let imageUrl: string | undefined = undefined;

  // Process Gyazo URL if provided
  if (gyazoUrl && typeof gyazoUrl === 'string' && gyazoUrl.trim().length > 0) {
    try {
      const url = new URL(gyazoUrl);
      const pathname = url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname;
      const potentialId = pathname.split('/').pop()?.replace(/\.(png|jpe?g|gif)$/i, '');

      if (potentialId && gyazoIdRegex.test(potentialId)) {
        imageUrl = `https://i.gyazo.com/${potentialId}.png`;
      } else {
        // If the ID is not valid, return an error
        return NextResponse.json({ error: 'Invalid Gyazo URL. Please use a valid Gyazo link.' }, { status: 400 });
      }
    } catch {
      // This catches errors from `new URL()` for malformed URLs
      return NextResponse.json({ error: 'Invalid URL format.' }, { status: 400 });
    }
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name.trim(),
        // Only update the image if a valid Gyazo URL was processed
        ...(imageUrl && { image: imageUrl }),
      },
    });
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'An unexpected error occurred while updating the profile.' }, { status: 500 });
  }
}
