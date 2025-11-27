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

// Fallback Switch if not available (I'll check if I can import it, if not I'll replace it)
// Actually, I didn't see switch.tsx in the list. I'll use a custom toggle or Checkbox.
// Let's use a Button for now to be safe and simple, or a Checkbox.
// "Safe Search: [ON/OFF]"

interface SafeSearchToggleProps {
  initialEnabled: boolean;
}

export default function SafeSearchToggle({ initialEnabled }: SafeSearchToggleProps) {
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();
  const { update } = useSession();

  const handleToggle = async () => {
    if (isEnabled) {
      // Trying to turn OFF -> Show confirmation
      setShowConfirm(true);
    } else {
      // Trying to turn ON -> Do it immediately
      await updateSetting(true);
    }
  };

  const confirmDisable = async () => {
    await updateSetting(false);
    setShowConfirm(false);
  };

  const updateSetting = async (enabled: boolean) => {
    try {
      const result = await updateSafeSearchSetting(enabled);
      if (result.success) {
        setIsEnabled(enabled);
        await update({ isSafeSearchEnabled: enabled });
        toast.success(enabled ? "セーフサーチを有効にしました" : "セーフサーチを無効にしました");
        router.refresh();
      } else {
        toast.error("設定の更新に失敗しました");
      }
    } catch (error) {
      toast.error("エラーが発生しました");
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
            className={isEnabled ? "bg-green-600 hover:bg-green-700" : "text-muted-foreground"}
        >
            {isEnabled ? "有効" : "無効"}
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
