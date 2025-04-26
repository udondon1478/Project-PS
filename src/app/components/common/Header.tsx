"use client";

import Link from 'next/link';
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from '@/components/ui/button';
import Image from 'next/image';

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="bg-gray-100 py-4">
      <div className="container mx-auto flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold">
          PolySeek
        </Link>
        <nav className="flex items-center">
          {session?.user ? (
            <>
              <Link href="/profile" className="mr-4">
                Profile
              </Link>
              <Button onClick={() => signOut()} className="mr-4">Sign Out</Button>
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt="avatar"
                  className="rounded-full"
                  width={32}
                  height={32}
                />
              )}
            </>
          ) : (
            <Button onClick={() => signIn()}>Sign In</Button>
          )}
        </nav>
      </div>
    </header>
  );
}
