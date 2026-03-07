import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
config.autoAddCss = false
import { SessionProvider } from "next-auth/react";
import Header from "@/components/Header";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import AuthGuard from "@/components/AuthGuard";
import MainLayout from "@/components/MainLayout";
import Footer from "@/components/Footer";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import CookieBanner from "@/components/CookieBanner";
import AnalyticsLoader from "@/components/AnalyticsLoader";
import { BASE_URL } from "@/lib/constants";

const SITE_DESCRIPTION =
  'PolySeekは、VRChat向けの3Dアバターやアクセサリーをタグベースで検索できるサービスです。一つの商品に対し、みんなでタグを付与していくことで検索性が向上します。';
const OG_IMAGE_PATH = '/images/PolySeek_icon_and_typo_1200.png';

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
  description: SITE_DESCRIPTION,
  icons: {
    icon: [
      { url: '/images/PolySeek_10_export_icon.svg', type: 'image/svg+xml', sizes: 'any' },
      { url: '/images/PolySeek_icon.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: { url: '/images/PolySeek_icon.png', sizes: '180x180' },
  },
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    title: 'PolySeek',
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE_PATH],
    type: 'website',
    url: BASE_URL,
    siteName: 'PolySeek',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PolySeek',
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE_PATH],
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
        <SessionProvider>
          <CookieConsentProvider>
            <ThemeProvider
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
