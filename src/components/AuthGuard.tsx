
"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

export default function AuthGuard({ children }: { children: ReactNode }) {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const router = useRouter();

    const isLoginPage = pathname === "/auth/login";
    const isAgreementPage = pathname === "/auth/agreement";
    // 利用規約とプライバシーポリシーは同意ページから読めるようにするため、常に許可
    const isTermsOrPrivacyPage = ["/terms", "/privacy"].some(path => pathname === path || (pathname.startsWith(path + "/")));
    const isPublicPage = ["/terms", "/privacy", "/", "/search", "/products"].some(path => pathname === path || (path !== "/" && pathname.startsWith(path + "/"))) || pathname.startsWith("/api") || pathname.startsWith("/auth");
    const hasAgreed = session?.user?.termsAgreedAt;

    // 認証済みだが未同意、かつ規約/プライバシーポリシーページでないかどうか
    const shouldForceAgreement = status === "authenticated" && !hasAgreed && !isTermsOrPrivacyPage;

    useEffect(() => {
        if (status === "loading") return;

        // Handle unauthenticated users trying to access protected routes
        if (status === "unauthenticated") {
            if (!isPublicPage) {
                router.replace("/auth/login");
            }
        } else if (shouldForceAgreement) {
            // shouldForceAgreementの条件を満たす場合、同意ページ以外ならリダイレクト
            if (!isAgreementPage) {
                router.replace("/auth/agreement");
            }
        } else if (status === "authenticated" && hasAgreed) {
            if (isAgreementPage) {
                router.replace("/");
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- 派生値（hasAgreed, isAgreementPage等）はsession, status, pathnameから算出されるため除外
    }, [session, status, pathname, router]);

    if (status === "loading") {
        return null; // Or a spinner
    }

    // If unauthenticated and on a protected page, don't render children
    // This prevents the flash while the useEffect redirects
    if (status === "unauthenticated" && !isPublicPage && !isLoginPage) {
        return null;
    }

    // 認証済みだが未同意の場合、同意ページと除外ページ以外はコンテンツを表示しない
    if (shouldForceAgreement && !isAgreementPage) {
        return null;
    }

    return <>{children}</>;
}
