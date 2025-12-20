import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
config.autoAddCss = false
import { SessionProvider } from "next-auth/react"; // SessionProviderをインポート
import Header from "@/components/Header";
import { ThemeProvider } from "@/components/theme-provider"; // ThemeProviderをインポート
import { Toaster } from "@/components/ui/sonner";
import AuthGuard from "@/components/AuthGuard";
import MainLayout from "@/components/MainLayout";
import Footer from "@/components/Footer";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import CookieBanner from "@/components/CookieBanner";
import AnalyticsLoader from "@/components/AnalyticsLoader";
import { BASE_URL } from "@/lib/constants";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    template: '%s - PolySeek',
    default: 'PolySeek',
  },
  description: "PolySeek - VRChatアバター・衣装・ギミック検索プラットフォーム",
  icons: {
    icon: [
      { url: '/images/PolySeek_10_export_icon.svg', type: 'image/svg+xml', sizes: 'any' },
      { url: '/images/PolySeek_icon.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: { url: '/images/PolySeek_icon.png', sizes: '180x180' },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning={true}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider> {/* SessionProviderでラップ */}
          <CookieConsentProvider>
            <ThemeProvider // ThemeProviderでラップ
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <Header />
              <AuthGuard>
                <MainLayout>
                  {children}
                </MainLayout>
              </AuthGuard>
              <Footer />
              <Toaster />
              <CookieBanner />
            </ThemeProvider>
            {process.env.NEXT_PUBLIC_GA_ID && (
              <AnalyticsLoader gaId={process.env.NEXT_PUBLIC_GA_ID} />
            )}
          </CookieConsentProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
