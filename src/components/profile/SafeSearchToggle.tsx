"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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

  const confirmDisable = async (e: React.MouseEvent) => {
    e.preventDefault();
    // Prevent double submission if already loading
    if (isLoading) return;
    // Dialog will be closed in updateSetting() only on successful update (see line 60-62)
    await updateSetting(false);
  };

  const updateSetting = async (enabled: boolean) => {
    setIsLoading(true);
    try {
      const result = await updateSafeSearchSetting(enabled);
      if (result.success) {
        setIsEnabled(enabled);
        await update({ isSafeSearchEnabled: enabled });
        toast.success(enabled ? "セーフサーチを有効にしました" : "セーフサーチを無効にしました");
        router.refresh();
        // Close dialog only on success if we were disabling
        if (!enabled) {
          setShowConfirm(false);
        }
      } else {
        toast.error("設定の更新に失敗しました");
      }
    } catch (error) {
      toast.error("エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
      <div className="space-y-0.5">
        <Label className="text-base font-semibold">セーフサーチ</Label>
        <p className="text-sm text-muted-foreground">
          R-18コンテンツを検索結果から除外します。
        </p>
      </div>
      <div className="flex items-center">
        <Button
            variant={isEnabled ? "default" : "outline"}
            onClick={handleToggle}
            disabled={isLoading}
            className={isEnabled ? "bg-green-600 hover:bg-green-700" : "text-muted-foreground"}
        >
            {isLoading ? "処理中..." : (isEnabled ? "有効" : "無効")}
        </Button>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>年齢確認</AlertDialogTitle>
            <AlertDialogDescription>
              セーフサーチをオフにすると、R-18コンテンツが表示される可能性があります。<br />
              あなたは18歳以上ですか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>いいえ</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDisable} className="bg-red-600 hover:bg-red-700">
              はい、18歳以上です
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
