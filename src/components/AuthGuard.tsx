
"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const router = useRouter();
    // const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        if (status === "loading") return;

        const hasAgreed = session?.user?.termsAgreedAt;
        const isAgreementPage = pathname === "/auth/agreement";
        const isLoginPage = pathname === "/auth/login";
        const isPublicPage = ["/terms", "/privacy", "/"].some(path => pathname === path || pathname.startsWith(path + "/")) || pathname.startsWith("/api") || pathname.startsWith("/auth");

        // Handle unauthenticated users trying to access protected routes
        if (status === "unauthenticated") {
            if (!isPublicPage && !isLoginPage) {
                router.push("/auth/login");
            }
        } else if (status === "authenticated" && !hasAgreed) {
            if (!isAgreementPage && !isPublicPage) {
                router.push("/auth/agreement");
            }
        } else if (status === "authenticated" && hasAgreed) {
            if (isAgreementPage) {
                router.push("/");
            }
        }

        // setIsChecking(false);
    }, [session, status, pathname, router]);

    // Optional: Show loading state while checking to prevent flash
    // But since this wraps the whole app, we might want to just render children 
    // and let the redirect happen (standard client-side protection pattern).
    // For better UX, we could return null if we are about to redirect.

    if (status === "loading") {
        return <>{children}</>; // Or a spinner
    }

    return <>{children}</>;
}
