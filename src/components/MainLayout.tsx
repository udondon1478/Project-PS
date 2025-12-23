"use client";

import { usePathname } from "next/navigation";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith("/auth");

  return (
    <div className={!isAuthPage ? "pt-header-mobile md:pt-header-desktop" : ""}>
      {children}
    </div>
  );
}
