"use client";

import React, { useState } from "react";
import type { MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslation } from 'react-i18next';
import { updateSafeSearchSetting } from "@/app/actions/user";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
interface SafeSearchToggleProps {
  initialEnabled: boolean;
}

export default function SafeSearchToggle({ initialEnabled }: SafeSearchToggleProps) {
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { update } = useSession();
  const { t } = useTranslation('profile');

  const handleToggle = async () => {
    if (isLoading) return;
    if (isEnabled) {
      // Trying to turn OFF -> Show confirmation
      setShowConfirm(true);
    } else {
      // Trying to turn ON -> Do it immediately
      await updateSetting(true);
    }
  };

  const confirmDisable = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // Prevent double submission if already loading
    if (isLoading) return;
    await updateSetting(false);
  };

  const updateSetting = async (enabled: boolean) => {
    setIsLoading(true);
    try {
      const result = await updateSafeSearchSetting(enabled);
      if (result.success) {
        setIsEnabled(enabled);
        await update({ isSafeSearchEnabled: enabled });
        toast.success(enabled ? t('safeSearch.enabledMessage') : t('safeSearch.disabledMessage'));
        router.refresh();
        // Close dialog only on success if we were disabling
        if (!enabled) {
          setShowConfirm(false);
        }
      } else {
        toast.error(t('safeSearch.updateFailed'));
      }
    } catch (error) {
      console.error("セーフサーチ設定の更新に失敗しました:", error);
      toast.error(t('safeSearch.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
      <div className="space-y-0.5">
        <Label className="text-base font-semibold">{t('safeSearch.label')}</Label>
        <p className="text-sm text-muted-foreground">
          {t('safeSearch.description')}
        </p>
      </div>
      <div className="flex items-center">
        <Button
            variant={isEnabled ? "default" : "outline"}
            onClick={handleToggle}
            disabled={isLoading}
            aria-pressed={isEnabled}
            className={isEnabled ? "bg-green-600 hover:bg-green-700" : "text-muted-foreground"}
        >
            {isLoading ? t('safeSearch.processing') : (isEnabled ? t('safeSearch.enabled') : t('safeSearch.disabled'))}
        </Button>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('safeSearch.ageVerification.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('safeSearch.ageVerification.description').split('\n').map((line, i) => (
                <span key={i}>{i > 0 && <br />}{line}</span>
              ))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('safeSearch.ageVerification.no')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDisable} disabled={isLoading} className="bg-red-600 hover:bg-red-700">
              {t('safeSearch.ageVerification.yes')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
