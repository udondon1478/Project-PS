"use client";

import { useEffect, useState, useRef } from 'react';
import { driver } from 'driver.js';
import "driver.js/dist/driver.css";

export default function OnboardingTour() {
  const [isMounted, setIsMounted] = useState(false);
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const arrowAnimationRef = useRef<number | null>(null);

  useEffect(() => {
    setIsMounted(true);
    
    return () => {
        if (arrowAnimationRef.current) {
            cancelAnimationFrame(arrowAnimationRef.current);
        }
    };
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    // Check if onboarding is already completed
    const hasCompletedOnboarding = localStorage.getItem('onboarding_completed');
    if (hasCompletedOnboarding) return;

    // Determine which register button to target based on screen width
    const isMobile = window.innerWidth < 768;
    const registerButtonId = isMobile ? '#tour-register-item-mobile' : '#tour-register-item-desktop';

    const updateArrowPosition = (targetSelector: string, popover: any) => {
        const targetElement = document.querySelector(targetSelector);
        const arrow = popover.arrow;
        const wrapper = popover.wrapper;

        if (targetElement && arrow && wrapper) {
            const targetRect = targetElement.getBoundingClientRect();
            const wrapperRect = wrapper.getBoundingClientRect();

            // Calculate center of target relative to wrapper
            const targetCenter = targetRect.left + (targetRect.width / 2);
            const wrapperLeft = wrapperRect.left;
            
            // Position arrow to point at target center
            const arrowLeft = targetCenter - wrapperLeft - 7; // 7 is half arrow width

            // Ensure arrow stays within wrapper bounds
            const minLeft = 5;
            const maxLeft = wrapperRect.width - 20;
            const clampedLeft = Math.max(minLeft, Math.min(arrowLeft, maxLeft));
            
            arrow.style.left = `${clampedLeft}px`;
            arrow.style.transform = 'none';
            
            // Force visibility
            arrow.style.display = 'block';
            arrow.style.visibility = 'visible';
            arrow.style.opacity = '1';
        }
        
        arrowAnimationRef.current = requestAnimationFrame(() => updateArrowPosition(targetSelector, popover));
    };

    const stopArrowAnimation = () => {
        if (arrowAnimationRef.current) {
            cancelAnimationFrame(arrowAnimationRef.current);
            arrowAnimationRef.current = null;
        }
    };

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
            onDeselected: stopArrowAnimation,
            popover: {
              title: '検索バー',
              description: '欲しいアセットをタグで検索できます。-をつけると除外検索も可能です。',
              side: "bottom",
              align: 'start'
            }
          },
          {
            element: '#tour-filter-button',
            onDeselected: stopArrowAnimation,
            popover: {
              title: 'フィルター',
              description: '価格帯やカテゴリで絞り込みができます。',
              side: "bottom",
              onPopoverRender: (popover) => {
                stopArrowAnimation(); // Clear existing animation if any
                updateArrowPosition('#tour-filter-button', popover);
              }
            }
          },
          {
            element: registerButtonId,
            onDeselected: stopArrowAnimation,
            popover: {
              title: '商品登録',
              description: 'BoothのURLを入力し、タグをつけることで、データベースに商品を追加・共有できます。',
              side: "bottom",
              onPopoverRender: (popover) => {
                stopArrowAnimation(); // Clear existing animation if any
                updateArrowPosition(registerButtonId, popover);
              },
              onNextClick: () => {
                localStorage.setItem('onboarding_completed', 'true');
                driverObj.destroy();
              }
            }
          }
        ],
        onDestroyed: () => {
          stopArrowAnimation();
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
