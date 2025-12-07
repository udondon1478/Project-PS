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
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
