import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import Discord from "next-auth/providers/discord"
import { Role, UserStatus } from "@prisma/client"

// Cookie secure settings: use __Secure-/__Host- prefix only when explicitly enabled
// In production, USE_SECURE_COOKIES defaults to true; in tests (.env.test), set to false
const useSecureCookies = process.env.USE_SECURE_COOKIES === 'true' || 
    (process.env.NODE_ENV === 'production' && process.env.USE_SECURE_COOKIES !== 'false');

export const authConfig = {
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
        Discord({
            clientId: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
        }),
    ],
    trustHost: true,
    session: { strategy: "jwt" },
    cookies: {
        sessionToken: {
            name: useSecureCookies
                ? `__Secure-authjs.session-token`
                : `authjs.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: useSecureCookies,
            },
        },
        callbackUrl: {
            name: useSecureCookies
                ? `__Secure-authjs.callback-url`
                : `authjs.callback-url`,
            options: {
                sameSite: 'lax',
                path: '/',
                secure: useSecureCookies,
            },
        },
        csrfToken: {
            name: useSecureCookies
                ? `__Host-authjs.csrf-token`
                : `authjs.csrf-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: useSecureCookies,
            },
        },
    },
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id!;
                token.role = user.role;
                token.status = user.status;
                token.termsAgreedAt = user.termsAgreedAt;
                token.isSafeSearchEnabled = user.isSafeSearchEnabled;
            }
            if (typeof token.isSafeSearchEnabled === "undefined") {
                token.isSafeSearchEnabled = true;
            }
            if (trigger === "update") {
                if (session?.termsAgreedAt) {
                    token.termsAgreedAt = session.termsAgreedAt ?? null;
                }
                if (typeof session?.isSafeSearchEnabled === 'boolean') {
                    token.isSafeSearchEnabled = session.isSafeSearchEnabled;
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = Object.values(Role).includes(token.role as Role)
                    ? (token.role as Role)
                    : Role.USER;
                session.user.status = Object.values(UserStatus).includes(token.status as UserStatus)
                    ? (token.status as UserStatus)
                    : UserStatus.ACTIVE;
                session.user.termsAgreedAt = token.termsAgreedAt;
                session.user.isSafeSearchEnabled = token.isSafeSearchEnabled ?? true;
            }
            return session;
        },
    },
} satisfies NextAuthConfig;
