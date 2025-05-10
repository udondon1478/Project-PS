import { auth } from "@/auth"; // src/auth.ts から認証設定をインポート
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  console.log("サーバーサイドで取得されたセッション情報:", session);

  if (session) {
    return NextResponse.json({
      message: "セッション情報がサーバーログに出力されました。",
      user: session.user, // セッションユーザー情報をクライアントに返す（任意）
    });
  } else {
    return NextResponse.json({
      message: "ユーザーはログインしていません。",
    }, { status: 401 }); // 未認証の場合は401 Unauthorizedを返す
  }
}