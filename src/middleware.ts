import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { protectedRoutes } from './lib/routes';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;

  // メンテナンスモードの制御
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';
  const isMaintenancePage = nextUrl.pathname === '/maintenance';

  if (isMaintenanceMode) {
    if (!isMaintenancePage) {
      return Response.redirect(new URL('/maintenance', nextUrl));
    }
    return;
  } else if (isMaintenancePage) {
    return Response.redirect(new URL('/', nextUrl));
  }

  const isLoggedIn = !!req.auth;
  const isProtectedRoute = protectedRoutes.some(route =>
    nextUrl.pathname === route || nextUrl.pathname.startsWith(`${route}/`)
  );

  if (isProtectedRoute && !isLoggedIn) {
    const callbackUrl = nextUrl.pathname + nextUrl.search;
    const encodedCallbackUrl = encodeURIComponent(callbackUrl);
    return Response.redirect(new URL(`/api/auth/signin?callbackUrl=${encodedCallbackUrl}`, nextUrl));
  }
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|sitemap-index.xml|sitemap).*)',
  ],
};