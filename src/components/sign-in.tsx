
"use client"; // クライアントコンポーネントとしてマーク

import { signIn, signOut } from "next-auth/react"; // next-auth/react から signIn と signOut をインポート
import { useSession } from "next-auth/react"; // useSession フックをインポート

export default function SignIn() {
  const { data: session, status } = useSession(); // セッション情報を取得

  if (status === "loading") {
    return <div>Loading...</div>; // セッション情報取得中はローディング表示
  }

  if (session) {
    // ログインしている場合、ユーザー名とログアウトボタンを表示
    return (
      <div>
        <p>Signed in as {session.user?.email}</p>
        <button onClick={() => signOut()}>Sign out</button>
      </div>
    );
  }

  // ログインしていない場合、サインインボタンを表示
  return (
    <div>
      <button onClick={() => signIn("google")}>Signin with Google</button>
    </div>
  );
}