"use client";

import { usePathname } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith("/auth");
  const shouldShowBreadcrumbs = pathname?.startsWith("/profile");

  return (
    <div className={!isAuthPage ? "pt-header-mobile md:pt-header-desktop" : ""}>
      {shouldShowBreadcrumbs && (
        <div className="container mx-auto px-4 pt-4">
          <Breadcrumbs />
        </div>
      )}
      {children}
    </div>
  );
}
