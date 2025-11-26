
"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const router = useRouter();

    const isLoginPage = pathname === "/auth/login";
    const isAgreementPage = pathname === "/auth/agreement";
    const isPublicPage = ["/terms", "/privacy", "/", "/search", "/products"].some(path => pathname === path || (path !== "/" && pathname.startsWith(path + "/"))) || pathname.startsWith("/api") || pathname.startsWith("/auth");

    useEffect(() => {
        if (status === "loading") return;

        const hasAgreed = session?.user?.termsAgreedAt;

        // Handle unauthenticated users trying to access protected routes
        if (status === "unauthenticated") {
            if (!isPublicPage) {
                router.replace("/auth/login");
            }
        } else if (status === "authenticated" && !hasAgreed) {
            if (!isAgreementPage && !isPublicPage) {
                router.replace("/auth/agreement");
            }
        } else if (status === "authenticated" && hasAgreed) {
            if (isAgreementPage) {
                router.replace("/");
            }
        }
    }, [session, status, pathname, router, isLoginPage, isPublicPage, isAgreementPage]);

    if (status === "loading") {
        return null; // Or a spinner
    }

    // If unauthenticated and on a protected page, don't render children
    // This prevents the flash while the useEffect redirects
    if (status === "unauthenticated" && !isPublicPage && !isLoginPage) {
        return null;
    }

    return <>{children}</>;
}
