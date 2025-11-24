import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Next.jsのミドルウェアとして機能させるための関数をエクスポート
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define protected routes that require authentication
  const protectedRoutes = ['/admin', '/profile', '/register-item'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute) {
    // Check if user is authenticated by looking for the session token cookie
    // NextAuth uses different cookie names based on useSecureCookies
    const sessionToken = request.cookies.get('next-auth.session-token') ||
      request.cookies.get('__Secure-next-auth.session-token');

    if (!sessionToken) {
      // Redirect unauthenticated users to login
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

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