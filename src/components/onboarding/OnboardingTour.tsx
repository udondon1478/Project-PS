"use client";

import { useEffect, useState, useRef } from 'react';
import { driver } from 'driver.js';
import "driver.js/dist/driver.css";

export default function OnboardingTour() {
  const [isMounted, setIsMounted] = useState(false);
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    // Check if onboarding is already completed
    const hasCompletedOnboarding = localStorage.getItem('onboarding_completed');
    if (hasCompletedOnboarding) return;

    // Determine which register button to target based on screen width
    const isMobile = window.innerWidth < 768;
    const registerButtonId = isMobile ? '#tour-register-item-mobile' : '#tour-register-item-desktop';

    const startTour = () => {
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
              align: 'center'
            }
          },
          {
            element: registerButtonId,
            popover: {
              title: '商品登録',
              description: 'BoothのURLを入力し、タグをつけることで、データベースに商品を追加・共有できます。',
              side: "bottom",
              align: 'start',
              onNextClick: () => {
                localStorage.setItem('onboarding_completed', 'true');
                driverObj.destroy();
              }
            }
          }
        ],
        onDestroyed: () => {
          // Do nothing here to prevent marking complete on skip/close
        }
      });
      
      driverRef.current = driverObj;
      driverObj.drive();
    };

    // Polling logic
    let attempts = 0;
    const maxAttempts = 15; // 15 * 200ms = 3 seconds
    const interval = 200;

    const checkElements = () => {
      const searchBar = document.querySelector('#tour-search-bar');
      const filterButton = document.querySelector('#tour-filter-button');
      const registerButton = document.querySelector(registerButtonId);

      if (searchBar && filterButton && registerButton) {
        startTour();
      } else {
        attempts++;
        if (attempts < maxAttempts) {
          timeoutRef.current = setTimeout(checkElements, interval);
        } else {
          console.warn('[OnboardingTour] Required elements not found after polling');
        }
      }
    };

    checkElements();

    return () => {
        if (driverRef.current) {
            driverRef.current.destroy();
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    };
  }, [isMounted]);

  return null;
}
