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
  DropdownMenuSeparator,
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
import { TRIGGER_SEARCH_SPOTLIGHT } from '@/constants/events';
import { XIcon, DiscordIcon } from '@/components/SocialIcons';
import { DISCORD_INVITE_URL, X_ACCOUNT_URL } from '@/lib/constants';
import { useTranslation } from 'react-i18next';

// 認証状態のプレースホルダーは削除

export default function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const { t: tAuth } = useTranslation('auth');

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

  const handleSpotlightClose = () => {
    setIsSpotlightActive(false);
  };

  useEffect(() => {
    const handleSpotlight = () => {
      setIsSpotlightActive(true);
      // scroll to top smoothly
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSpotlightActive && e.key === 'Escape') {
        handleSpotlightClose();
      }
    };

    window.addEventListener(TRIGGER_SEARCH_SPOTLIGHT, handleSpotlight);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener(TRIGGER_SEARCH_SPOTLIGHT, handleSpotlight);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSpotlightActive]);

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
          } z-50`} 
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
                  <Image src="/images/PolySeek_icon.svg" alt="PolySeek Logo" width={32} height={32} className="h-8 w-auto" />
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
                             <Button variant="ghost" className="w-full justify-start">{t('nav.registerItem')}</Button>
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link href="/profile">
                             <Button variant="ghost" className="w-full justify-start">{t('nav.editProfile')}</Button>
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link href="/profile/likes">
                             <Button variant="ghost" className="w-full justify-start">{t('nav.likedItems')}</Button>
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link href="/profile/owned">
                             <Button variant="ghost" className="w-full justify-start">{t('nav.ownedItems')}</Button>
                          </Link>
                        </SheetClose>
                        {session?.user?.role === 'ADMIN' && (
                          <>
                            <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
                            <SheetClose asChild>
                              <Link href="/admin">
                                <Button variant="ghost" className="w-full justify-start">
                                  🛡️ {t('nav.admin')}
                                </Button>
                              </Link>
                            </SheetClose>
                          </>
                        )}
                        <SheetClose asChild>
                          <Button variant="ghost" className="w-full justify-start" onClick={() => signOut()}>{t('nav.logout')}</Button>
                        </SheetClose>
                      </>
                    ) : (
                      <>
                         <Button variant="ghost" className="w-full justify-start" onClick={() => { setActiveDialog('register'); setIsSheetOpen(false); }}>{t('nav.registerItem')}</Button>
                         <Button variant="ghost" className="w-full justify-start" onClick={() => { setActiveDialog('signup'); setIsSheetOpen(false); }}>{t('nav.signup')}</Button>
                         <Button variant="ghost" className="w-full justify-start" onClick={() => { setActiveDialog('login'); setIsSheetOpen(false); }}>{t('nav.login')}</Button>
                      </>
                    )}
                 </div>
                  {/* Mobile Social Icons */}
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-center space-x-8">
                     <a
                       href={X_ACCOUNT_URL}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="text-muted-foreground hover:text-foreground transition-colors"
                       aria-label={t('aria.x')}
                     >
                       <XIcon className="h-6 w-6" />
                     </a>
                     <a
                       href={DISCORD_INVITE_URL}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="text-muted-foreground hover:text-[#5865F2] transition-colors"
                       aria-label={t('aria.discord')}
                     >
                       <DiscordIcon className="h-6 w-6" />
                     </a>
                  </div>
               </SheetContent>
             </Sheet>
             </div>
          </div>
 
          {/* Desktop Navigation (Hidden on small screens) */}
          <Link href="/" className="hidden md:flex items-center space-x-2">
            <Image src="/images/PolySeek_icon.svg" alt="PolySeek Logo" width={32} height={32} className="h-8 w-auto" />
            <Image src="/images/PolySeek_logo_type.svg" alt="PolySeek" width={100} height={24} className="h-6 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center space-x-2" suppressHydrationWarning>
            {/* Desktop Social Icons */}
            <div className="flex items-center mr-2 pr-4 border-r border-gray-200 dark:border-gray-700 space-x-1">
              <a
                href={X_ACCOUNT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
                aria-label={t('aria.x')}
              >
                <XIcon className="h-5 w-5" />
              </a>
              <a
                href={DISCORD_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-muted-foreground hover:text-[#5865F2] transition-colors rounded-md hover:bg-accent"
                aria-label={t('aria.discord')}
              >
                <DiscordIcon className="h-5 w-5" />
              </a>
            </div>

            {status === "loading" ? (
              <HeaderNavigationSkeleton variant="desktop" />
            ) : status === "authenticated" ? (
              <React.Fragment>
                <Link href="/register-item">
                  <Button variant="ghost" size="sm" id="tour-register-item-desktop">{t('nav.registerItem')}</Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild data-testid="profile-trigger">
                    <Button variant="ghost" size="sm">{t('nav.profile')}</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>
                      <Link href="/profile">{t('nav.editProfile')}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href="/profile/likes">{t('nav.likedItems')}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href="/profile/owned">{t('nav.ownedItems')}</Link>
                    </DropdownMenuItem>
                    {session?.user?.role === 'ADMIN' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Link href="/admin" className="flex items-center gap-2">
                            <span>🛡️</span>
                            <span>{t('nav.admin')}</span>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="sm" onClick={() => signOut()}>
                  {t('nav.logout')}
                </Button>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <Button variant="ghost" size="sm" id="tour-register-item-desktop" onClick={() => setActiveDialog('register')}>{t('nav.registerItem')}</Button>
                <Button variant="ghost" size="sm" onClick={() => setActiveDialog('signup')}>{t('nav.signup')}</Button>
                <Button variant="ghost" size="sm" onClick={() => setActiveDialog('login')}>{t('nav.login')}</Button>
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
                  <DialogTitle>{tAuth('dialog.register.title')}</DialogTitle>
                  <DialogDescription>
                    {tAuth('dialog.register.description')}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col space-y-4">
                  <Button onClick={() => signIn('google')}>{tAuth('provider.google.login')}</Button>
                  <Button onClick={() => signIn('discord')}>{tAuth('provider.discord.login')}</Button>
                </div>
                <AuthDialogNotice onClose={() => setActiveDialog(null)} />
              </>
            )}
            {activeDialog === 'signup' && (
              <>
                <DialogHeader>
                  <DialogTitle>{tAuth('dialog.signup.title')}</DialogTitle>
                  <DialogDescription>
                    {tAuth('dialog.signup.description')}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col space-y-4">
                  <Button onClick={() => signIn('google')}>{tAuth('provider.google.signup')}</Button>
                  <Button onClick={() => signIn('discord')}>{tAuth('provider.discord.signup')}</Button>
                </div>
                <AuthDialogNotice onClose={() => setActiveDialog(null)} />
              </>
            )}
            {activeDialog === 'login' && (
               <>
                <DialogHeader>
                  <DialogTitle>{tAuth('dialog.login.title')}</DialogTitle>
                  <DialogDescription>
                    {tAuth('dialog.login.description')}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col space-y-4">
                  <Button onClick={() => signIn('google')}>{tAuth('provider.google.login')}</Button>
                  <Button onClick={() => signIn('discord')}>{tAuth('provider.discord.login')}</Button>
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