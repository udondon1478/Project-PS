import Link from 'next/link';
import React from 'react';

type AuthDialogNoticeProps = {
  onClose: () => void;
};

export const AuthDialogNotice: React.FC<AuthDialogNoticeProps> = ({ onClose }) => {
  return (
    <p className="text-xs text-muted-foreground mt-2">
      ※ セキュリティ向上のため、メールアドレス・パスワードでのアカウント登録には対応しておりません。
      <Link href="/faq#oauth" className="underline ml-1" onClick={onClose}>詳しくはこちら</Link>
    </p>
  );
};
