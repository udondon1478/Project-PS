"use client";

import { useState } from "react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteAccount } from "@/app/actions/user";
import { signOut } from "next-auth/react";

export default function DeleteAccountSection() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteAccount();
      if (result.success) {
        await signOut({ callbackUrl: '/' });
      } else {
        setError(result.error || "Failed to delete account");
        setIsDeleting(false);
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred");
      setIsDeleting(false);
    }
  };

  return (
    <div className="pt-6 border-t mt-8">
      <h3 className="text-lg font-medium text-red-600">Danger Zone</h3>
      <p className="text-sm text-gray-500 mb-4">
        アカウントを削除すると、元に戻すことはできません。
      </p>
      
      {error && <p className="text-red-500 mb-4">{error}</p>}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" disabled={isDeleting}>
            アカウント削除
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。あなたのアカウント情報は匿名化され、ログインできなくなります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteAccount();
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? '削除中...' : '削除する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
