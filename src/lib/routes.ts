/**
 * Routes that require authentication.
 * These routes will be protected by the middleware and AuthGuard.
 */
export const protectedRoutes = [
    '/admin',
    '/profile',
    '/register-item',
];
