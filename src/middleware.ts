import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/* eslint-disable @typescript-eslint/no-unused-vars */ // 未使用変数のESLintルールを無効化

// Next.jsのミドルウェアとして機能させるための関数をエクスポート
export function middleware(_request: NextRequest) {
  // ここにPrismaClientに依存しないミドルウェア処理を記述できます
  // 例: ヘッダーの追加、特定のパスへのリダイレクトなど

  // リクエストを次に渡す
  return NextResponse.next();
}

// ミドルウェアを実行するパスを指定 (必要に応じて調整)
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};