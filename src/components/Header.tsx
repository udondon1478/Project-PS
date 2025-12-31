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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Menu } from 'lucide-react';
import React from 'react';
import ProductSearch from '@/components/search/ProductSearch'; // Import ProductSearch
import { ProductSearchSkeleton } from '@/components/search/ProductSearchSkeleton';
import { AuthDialogNotice } from '@/components/AuthDialogNotice';
import { HeaderNavigationSkeleton } from '@/components/HeaderNavigationSkeleton';

// 認証状態のプレースホルダーは削除

export default function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  type DialogType = 'register' | 'signup' | 'login' | null;
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false); // Sheetの状態管理を追加
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

  const [isSpotlightActive, setIsSpotlightActive] = useState(false);

  useEffect(() => {
    const handleSpotlight = () => {
      setIsSpotlightActive(true);
      // scroll to top smoothly
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('trigger-search-spotlight', handleSpotlight);
    return () => window.removeEventListener('trigger-search-spotlight', handleSpotlight);
  }, []);

  const handleSpotlightClose = () => {
    setIsSpotlightActive(false);
  };

  return (
    // Apply bg-white to the outer header to ensure ProductSearch background blends correctly
    <>
      <div 
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-500 ease-in-out ${
          isSpotlightActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleSpotlightClose}
        aria-hidden="true"
      />
      <header
        ref={headerRef}
        className={`fixed top-0 left-0 w-full bg-white dark:bg-gray-900 transition-transform duration-300 ease-in-out ${
          isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
          } ${isSpotlightActive ? 'z-50' : 'z-50'}`} 
        style={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}
      >
        {/* Local Overlay for Header (covers Log/Nav) */}
        <div 
          className={`absolute inset-0 bg-black/60 z-10 transition-opacity duration-500 ease-in-out ${
            isSpotlightActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          onClick={handleSpotlightClose}
          aria-hidden="true"
        />

        {/* Top Navigation Bar */}
        <div className="container mx-auto py-3 px-4 md:px-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 relative z-0"> 
          {/* Mobile Navigation (Visible on small screens) */}
          <div className="md:hidden flex items-center w-full relative min-h-[40px]" suppressHydrationWarning>
             {/* Logo - Centered */}
             <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <Link href="/" className="flex items-center">
                  <Image src="/images/PolySeek_10_export_icon.svg" alt="PolySeek Logo" width={32} height={32} className="h-8 w-auto" />
                </Link>
             </div>
 
             {/* Menu Trigger - Right Aligned */}
             <div className="ml-auto">
               <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                 <SheetTrigger asChild>
                   <Button variant="ghost" size="icon" aria-label="Menu">
                     <Menu className="h-6 w-6" />
                   </Button>
                 </SheetTrigger>
                 <SheetContent side="right">
                   <SheetTitle className="sr-only">Menu</SheetTitle> {/* Accessibility fix for Sheet */}
                   <div className="flex flex-col space-y-4 mt-6">
                    {status === "loading" ? (
                      <div className="space-y-4">
                        <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                        <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                      </div>
                    ) : status === "authenticated" ? (
                      <>
                        <SheetClose asChild>
                          <Link href="/register-item">
                             <Button variant="ghost" className="w-full justify-start">商品登録</Button>
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link href="/profile">
                             <Button variant="ghost" className="w-full justify-start">プロフィール編集</Button>
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link href="/profile/likes">
                             <Button variant="ghost" className="w-full justify-start">いいねした商品</Button>
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link href="/profile/owned">
                             <Button variant="ghost" className="w-full justify-start">所有済み商品</Button>
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Button variant="ghost" className="w-full justify-start" onClick={() => signOut()}>ログアウト</Button>
                        </SheetClose>
                      </>
                    ) : (
                      <>
                         <Button variant="ghost" className="w-full justify-start" onClick={() => { setActiveDialog('register'); setIsSheetOpen(false); }}>商品登録</Button>
                         <Button variant="ghost" className="w-full justify-start" onClick={() => { setActiveDialog('signup'); setIsSheetOpen(false); }}>新規登録</Button>
                         <Button variant="ghost" className="w-full justify-start" onClick={() => { setActiveDialog('login'); setIsSheetOpen(false); }}>ログイン</Button>
                      </>
                    )}
                 </div>
               </SheetContent>
             </Sheet>
             </div>
          </div>
 
          {/* Desktop Navigation (Hidden on small screens) */}
          <Link href="/" className="hidden md:flex items-center space-x-2">
            <Image src="/images/PolySeek_10_export_icon.svg" alt="PolySeek Logo" width={32} height={32} className="h-8 w-auto" />
            <Image src="/images/PolySeek_logo_type.svg" alt="PolySeek" width={100} height={24} className="h-6 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center space-x-2" suppressHydrationWarning>
            {status === "loading" ? (
              <HeaderNavigationSkeleton variant="desktop" />
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
                <Button variant="ghost" size="sm" id="tour-register-item-desktop" onClick={() => setActiveDialog('register')}>商品登録</Button>
                <Button variant="ghost" size="sm" onClick={() => setActiveDialog('signup')}>新規登録</Button>
                <Button variant="ghost" size="sm" onClick={() => setActiveDialog('login')}>ログイン</Button>
              </React.Fragment>
            )}
          </nav>
        </div>
 
        {/* Product Search Component - Placed below the top navigation bar */}
        {/* The ProductSearch component itself handles padding and background */}
        <Suspense fallback={<ProductSearchSkeleton />}>
          <ProductSearch 
            isSafeSearchEnabled={session?.user?.isSafeSearchEnabled ?? true} 
            isSpotlightActive={isSpotlightActive}
            onSpotlightDismiss={handleSpotlightClose}
          />
        </Suspense>
 
      <Dialog open={!!activeDialog} onOpenChange={(open) => !open && setActiveDialog(null)}>
          <DialogContent>
            {activeDialog === 'register' && (
               <>
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
                <AuthDialogNotice onClose={() => setActiveDialog(null)} />
              </>
            )}
            {activeDialog === 'signup' && (
              <>
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
                <AuthDialogNotice onClose={() => setActiveDialog(null)} />
              </>
            )}
            {activeDialog === 'login' && (
               <>
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
                <AuthDialogNotice onClose={() => setActiveDialog(null)} />
              </>
            )}
          </DialogContent>
        </Dialog>
      </header>
    </>
  );
}