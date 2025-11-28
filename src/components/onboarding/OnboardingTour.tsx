"use client";

import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import "driver.js/dist/driver.css";

export default function OnboardingTour() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    // Check if onboarding is already completed
    const hasCompletedOnboarding = localStorage.getItem('onboarding_completed');
    if (hasCompletedOnboarding) return;

    // Determine which register button to target based on screen width
    // Mobile breakpoint is usually 768px (md in Tailwind)
    const isMobile = window.innerWidth < 768;
    const registerButtonId = isMobile ? '#tour-register-item-mobile' : '#tour-register-item-desktop';

    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      doneBtnText: '完了',
      nextBtnText: '次へ',
      prevBtnText: '前へ',
      progressText: 'ステップ {{current}} / {{total}}',
      steps: [
        {
          element: '#tour-search-bar',
          popover: {
            title: '検索バー',
            description: '欲しいアセットをタグで検索できます。-をつけると除外検索も可能です。',
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '#tour-filter-button',
          popover: {
            title: 'フィルター',
            description: '価格帯やカテゴリで絞り込みができます。',
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: registerButtonId,
          popover: {
            title: '商品登録',
            description: 'BoothのURLを入力し、タグをつけることで、データベースに商品を追加・共有できます。',
            side: "bottom",
            align: 'start'
          }
        }
      ],
      onDestroyed: () => {
        localStorage.setItem('onboarding_completed', 'true');
      }
    });

    // Slight delay to ensure elements are rendered and layout is stable
    const timer = setTimeout(() => {
        driverObj.drive();
    }, 1000);

    return () => clearTimeout(timer);
  }, [isMounted]);

  return null;
}
