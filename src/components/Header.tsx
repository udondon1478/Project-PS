"use client";

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession, signIn, signOut } from "next-auth/react"; // next-auth/reactからインポート
import { Button } from '@/components/ui/button';
import React from 'react';
import ProductSearch from '@/components/search/ProductSearch'; // Import ProductSearch

// 認証状態のプレースホルダーは削除

export default function Header() {
  const { data: session, status } = useSession(); // useSessionフックを使用
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const headerRef = useRef<HTMLElement>(null);

    const handleScroll = useCallback(() => {
      const currentScrollPos = window.scrollY;
      // Show header only when scrolling up significantly or near the top
      const isScrollingUp = currentScrollPos < prevScrollPos; // Increase threshold to 20
      const isNearTop = currentScrollPos < 50;

      setIsHeaderVisible(isScrollingUp || isNearTop);
      // Update prevScrollPos based on scroll direction
      if (currentScrollPos > prevScrollPos) {
          // Scrolling down
          setPrevScrollPos(currentScrollPos);
      } else if (currentScrollPos < prevScrollPos) {
          // Scrolling up - update regardless of threshold for visibility check
           setPrevScrollPos(currentScrollPos);
      }
      // Note: The visibility check (isScrollingUp) still uses the threshold
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
      className={`fixed top-0 left-0 w-full bg-white z-50 transition-transform duration-300 ease-in-out ${ // Added z-index and ease
        isHeaderVisible ? 'translate-y-0' : '-translate-y-full' // Use -translate-y-full for clarity
      }`}
      style={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }} // Apply shadow here if needed consistently
    >
      {/* Top Navigation Bar */}
      <div className="container mx-auto py-3 px-4 md:px-6 flex items-center justify-between border-b border-gray-200"> {/* Reduced padding slightly, added border */}
        {/* Mobile Navigation (Visible on small screens) */}
        {status === "authenticated" && ( // 認証済みの場合
          <div className="md:hidden flex items-center justify-between w-full">
            <Link href="/profile"> {/* ルートグループを除いたパスに修正 */}
              <Button variant="ghost" size="sm">プロフィール</Button>
            </Link>
            <Link href="/" className="flex items-center">
              <img src="/pslogo.svg" alt="PolySeek Logo" className="h-6 w-auto" />
            </Link>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>ログアウト</Button>
          </div>
        )}
        {status === "unauthenticated" && ( // 未認証の場合
          <div className="md:hidden flex items-center justify-between w-full">
             <Button variant="ghost" size="sm" onClick={() => signIn('google')}>Googleログイン</Button>
             <Button variant="ghost" size="sm" onClick={() => signIn('discord')}>Discordログイン</Button>
             <Link href="/" className="flex items-center">
               <img src="/pslogo.svg" alt="PolySeek Logo" className="h-6 w-auto" />
             </Link>
             {/* Googleログインのみなので登録ボタンは非表示にするか検討 */}
             <Link href="/(auth)/register">
                <Button variant="default" size="sm">登録</Button>
             </Link>
          </div>
        )}
        {/* status === "loading" の場合は何も表示しないか、ローディング表示を追加 */}

        {/* Desktop Navigation (Hidden on small screens) */}
        <Link href="/" className="hidden md:flex items-center space-x-2">
          <img src="/pslogo.svg" alt="PolySeek Logo" className="h-6 w-auto" />
          <span className="text-xl font-bold">PolySeek</span> {/* Slightly smaller text */}
        </Link>
        <nav className="hidden md:flex items-center space-x-2"> {/* Reduced space */}
          {/* 認証状態に応じて表示を切り替え */}
          {status === "loading" && (
            <div className="h-8 w-20 animate-pulse bg-gray-200 rounded"></div> // ローディング表示例
          )}
          {status === "unauthenticated" && (
            <React.Fragment>
              {/* ログインボタン: Googleログインを実行 */}
              <Button variant="ghost" size="sm" onClick={() => signIn('google')}>
                Googleログイン
              </Button>
              <Button variant="ghost" size="sm" onClick={() => signIn('discord')}>
                Discordログイン
              </Button>
              {/* Googleログインのみの場合、登録ボタンは不要かもしれない */}
              <Link href="/(auth)/register">
                <Button variant="default" size="sm">登録</Button>
              </Link>
            </React.Fragment>
          )}
          {status === "authenticated" && (
            <React.Fragment>
              <Link href="/profile"> {/* ルートグループを除いたパスに修正 */}
                <Button variant="ghost" size="sm">プロフィール</Button>
              </Link>
              {/* ログアウトボタン */}
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                ログアウト
              </Button>
            </React.Fragment>
          )}
        </nav>
      </div>

      {/* Product Search Component - Placed below the top navigation bar */}
      {/* The ProductSearch component itself handles padding and background */}
      <ProductSearch />

    </header>
  );
}