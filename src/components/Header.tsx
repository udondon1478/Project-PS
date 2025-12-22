/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from 'next/navigation';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import React from 'react';
import ProductSearch from '@/components/search/ProductSearch'; // Import ProductSearch
import { ProductSearchSkeleton } from '@/components/search/ProductSearchSkeleton';
import { AuthDialogNotice } from '@/components/AuthDialogNotice';

// 認証状態のプレースホルダーは削除

export default function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  const handleScroll = useCallback(() => {
    const currentScrollPos = window.scrollY;
    // Show header only when scrolling up significantly or near the top
    const isScrollingUp = currentScrollPos < prevScrollPos;
    const isNearTop = currentScrollPos < 50;

    setIsHeaderVisible(isScrollingUp || isNearTop);
    // Update prevScrollPos based on scroll direction
    if (currentScrollPos > prevScrollPos) {
      // Scrolling down
      setPrevScrollPos(currentScrollPos);
    } else if (currentScrollPos < prevScrollPos) {
      // Scrolling up
      setPrevScrollPos(currentScrollPos);
    }
  }, [prevScrollPos]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  return (
    // Apply bg-white to the outer header to ensure ProductSearch background blends correctly
    <header
      ref={headerRef}
      className={`fixed top-0 left-0 w-full bg-white dark:bg-gray-900 z-50 transition-transform duration-300 ease-in-out ${ // Added z-index and ease
        isHeaderVisible ? 'translate-y-0' : '-translate-y-full' // Use -translate-y-full for clarity
        }`}
      style={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }} // Apply shadow here if needed consistently
    >
      {/* Top Navigation Bar */}
      <div className="container mx-auto py-3 px-4 md:px-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-700"> {/* Reduced padding slightly, added border */}
        {/* Mobile Navigation (Visible on small screens) */}
        {/* Mobile Navigation (Visible on small screens) */}
        <div className="md:hidden flex items-center justify-between w-full" suppressHydrationWarning>
          {status === "loading" ? (
            <>
              {/* Loading placeholder */}
              <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
              <Link href="/" className="flex items-center">
                <Image src="/images/PolySeek_10_export_icon.svg" alt="PolySeek Logo" width={32} height={32} className="h-8 w-auto" />
              </Link>
              <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
            </>
          ) : status === "authenticated" ? (
            <>
              <Link href="/register-item">
                <Button variant="ghost" size="sm" id="tour-register-item-mobile">商品登録</Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">プロフィール</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <Link href="/profile">プロフィール編集</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/profile/likes">いいねした商品</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/profile/owned">所有済み商品</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Link href="/" className="flex items-center">
                <Image src="/images/PolySeek_10_export_icon.svg" alt="PolySeek Logo" width={32} height={32} className="h-8 w-auto" />
              </Link>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>ログアウト</Button>
            </>
          ) : (
            <>
              <Dialog open={isRegisterModalOpen} onOpenChange={setIsRegisterModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" id="tour-register-item-mobile">商品登録</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>商品登録にはログインが必要です</DialogTitle>
                    <DialogDescription>
                      商品登録を行うには、以下のいずれかの方法でログインしてください。
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col space-y-4">
                    <Button onClick={() => signIn('google')}>Googleでログイン</Button>
                    <Button onClick={() => signIn('discord')}>Discordでログイン</Button>
                  </div>
                  <AuthDialogNotice onClose={() => setIsRegisterModalOpen(false)} />

                </DialogContent>
              </Dialog>
              <Link href="/" className="flex items-center">
                <Image src="/images/PolySeek_10_export_icon.svg" alt="PolySeek Logo" width={32} height={32} className="h-8 w-auto" />
              </Link>
              <Dialog open={isSignUpModalOpen} onOpenChange={setIsSignUpModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">新規登録</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>新規登録</DialogTitle>
                    <DialogDescription>
                      以下のいずれかの方法で登録してください。
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col space-y-4">
                    <Button onClick={() => signIn('google')}>Googleで登録</Button>
                    <Button onClick={() => signIn('discord')}>Discordで登録</Button>
                  </div>
                  <AuthDialogNotice onClose={() => setIsSignUpModalOpen(false)} />

                </DialogContent>
              </Dialog>
              <Dialog open={isLoginModalOpen} onOpenChange={setIsLoginModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">ログイン</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>ログイン</DialogTitle>
                    <DialogDescription>
                      以下のいずれかの方法でログインしてください。
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col space-y-4">
                    <Button onClick={() => signIn('google')}>Googleでログイン</Button>
                    <Button onClick={() => signIn('discord')}>Discordでログイン</Button>
                  </div>
                  <AuthDialogNotice onClose={() => setIsLoginModalOpen(false)} />

                </DialogContent>
              </Dialog>
            </>
          )}
        </div>

        {/* Desktop Navigation (Hidden on small screens) */}
        <Link href="/" className="hidden md:flex items-center space-x-2">
          <Image src="/images/PolySeek_10_export_icon.svg" alt="PolySeek Logo" width={32} height={32} className="h-8 w-auto" />
          <Image src="/images/PolySeek_logo_type.svg" alt="PolySeek" width={100} height={24} className="h-6 w-auto" />
        </Link>
        <nav className="hidden md:flex items-center space-x-2" suppressHydrationWarning>
          {status === "loading" ? (
            <React.Fragment>
              {/* Loading placeholder */}
              <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
              <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
              <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
            </React.Fragment>
          ) : status === "authenticated" ? (
            <React.Fragment>
              <Link href="/register-item">
                <Button variant="ghost" size="sm" id="tour-register-item-desktop">商品登録</Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild data-testid="profile-trigger">
                  <Button variant="ghost" size="sm">プロフィール</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <Link href="/profile">プロフィール編集</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/profile/likes">いいねした商品</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/profile/owned">所有済み商品</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                ログアウト
              </Button>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <Dialog open={isRegisterModalOpen} onOpenChange={setIsRegisterModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" id="tour-register-item-desktop">商品登録</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>商品登録にはログインが必要です</DialogTitle>
                    <DialogDescription>
                      商品登録を行うには、以下のいずれかの方法でログインしてください。
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col space-y-4">
                    <Button onClick={() => signIn('google')}>Googleでログイン</Button>
                    <Button onClick={() => signIn('discord')}>Discordでログイン</Button>
                  </div>
                  <AuthDialogNotice onClose={() => setIsRegisterModalOpen(false)} />

                </DialogContent>
              </Dialog>
              <Dialog open={isSignUpModalOpen} onOpenChange={setIsSignUpModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">新規登録</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>新規登録</DialogTitle>
                    <DialogDescription>
                      以下のいずれかの方法で登録してください。
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col space-y-4">
                    <Button onClick={() => signIn('google')}>Googleで登録</Button>
                    <Button onClick={() => signIn('discord')}>Discordで登録</Button>
                  </div>
                  <AuthDialogNotice onClose={() => setIsSignUpModalOpen(false)} />

                </DialogContent>
              </Dialog>
              <Dialog open={isLoginModalOpen} onOpenChange={setIsLoginModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">ログイン</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>ログイン</DialogTitle>
                    <DialogDescription>
                      以下のいずれかの方法でログインしてください。
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col space-y-4">
                    <Button onClick={() => signIn('google')}>Googleでログイン</Button>
                    <Button onClick={() => signIn('discord')}>Discordでログイン</Button>
                  </div>
                  <AuthDialogNotice onClose={() => setIsLoginModalOpen(false)} />

                </DialogContent>
              </Dialog>
            </React.Fragment>
          )}
        </nav>
      </div>

      {/* Product Search Component - Placed below the top navigation bar */}
      {/* The ProductSearch component itself handles padding and background */}
      <Suspense fallback={<ProductSearchSkeleton />}>
        <ProductSearch isSafeSearchEnabled={session?.user?.isSafeSearchEnabled ?? true} />
      </Suspense>

    </header>
  );
}