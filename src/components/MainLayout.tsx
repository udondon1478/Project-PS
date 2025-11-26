"use client";

import { usePathname } from "next/navigation";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith("/auth");

  return (
    <div className={!isAuthPage ? "pt-20 md:pt-40" : ""}>
      {children}
    </div>
  );
}
