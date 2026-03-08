"use client";

import { useState } from "react";
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('profile');

  const handleDeleteAccount = async () => {
    setError(null);
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
      <h3 className="text-lg font-medium text-red-600">{t('deleteAccount.title')}</h3>
      <p className="text-sm text-gray-500 mb-4">
        {t('deleteAccount.description')}
      </p>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" disabled={isDeleting}>
            {t('deleteAccount.button')}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteAccount.confirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteAccount.confirm.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('deleteAccount.confirm.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteAccount();
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={isDeleting}
            >
              {isDeleting ? t('deleteAccount.confirm.deleting') : t('deleteAccount.confirm.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
