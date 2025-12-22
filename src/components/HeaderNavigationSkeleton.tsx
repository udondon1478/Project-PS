import Link from 'next/link';
import Image from 'next/image';
import React from 'react';

export function HeaderNavigationSkeleton({ 
  variant = 'desktop' 
}: { 
  variant?: 'mobile' | 'desktop' 
}) {
  if (variant === 'mobile') {
    return (
      <>
        <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
        <Link href="/" className="flex items-center">
          <Image src="/images/PolySeek_10_export_icon.svg" alt="PolySeek Logo" width={32} height={32} className="h-8 w-auto" />
        </Link>
        <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
      </>
    );
  }
  
  return (
    <>
      <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
      <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
      <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
    </>
  );
}
