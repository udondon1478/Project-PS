"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { features } from "@/constants/features";
import { TRIGGER_SEARCH_SPOTLIGHT } from "@/constants/events";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AuthDialogNotice } from "@/components/AuthDialogNotice";
import { toast } from "sonner";

// Define dialog configuration for better maintainability and to avoid duplication
const DIALOG_CONFIG = {
  register: {
    title: "商品登録にはログインが必要です",
    description: "商品登録を行うには、以下のいずれかの方法でログインしてください。",
  },
  login: {
    title: "ログイン",
    description: "以下のいずれかの方法でログインしてください。",
  },
} as const;

export default function ServiceIntroSection() {
  const { status } = useSession();
  const [activeDialog, setActiveDialog] = useState<'register' | 'login' | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, href: string, featureId?: string) => {
    // 豊富な検索条件クリック時はヘッダーを強調表示
    if (featureId === 'advanced-search') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent(TRIGGER_SEARCH_SPOTLIGHT));
      return;
    }

    if (status !== "authenticated") {
      if (href === "/register-item") {
        e.preventDefault();
        setActiveDialog('register');
      } else if (href === "/profile") {
        e.preventDefault();
        setActiveDialog('login');
      }
    }
  };

  const handleSignIn = async (provider: 'google' | 'discord') => {
    try {
      setIsLoggingIn(true);
      await signIn(provider);
    } catch (error) {
      console.error("Login failed:", error);
      toast.error("ログインに失敗しました。もう一度お試しください。");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const activeConfig = activeDialog ? DIALOG_CONFIG[activeDialog] : null;

  return (
    <>
      <section
        aria-label="サービス紹介"
        className="mt-4 md:mt-0 mb-12"
      >
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            VRChat向け商品をタグで効率的に検索
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            PolySeekは、VRChat向けの3Dアバターやアクセサリーをタグベースで検索できるサービスです。
            一つの商品に対し、みんなでタグを付与していくことで検索性が向上します。
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <Link 
              key={feature.id} 
              href={feature.href}
              onClick={(e) => handleNavigation(e, feature.href, feature.id)}
              className="block h-full group"
            >
              <Card className="text-center h-full transition-colors hover:bg-muted/50">
                <CardHeader className="flex flex-col items-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription className="whitespace-pre-wrap">{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <Dialog open={!!activeDialog} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent>
          {activeConfig && (
            <>
              <DialogHeader>
                <DialogTitle>{activeConfig.title}</DialogTitle>
                <DialogDescription>
                  {activeConfig.description}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col space-y-4">
                <Button 
                  onClick={() => handleSignIn('google')} 
                  disabled={isLoggingIn}
                >
                  Googleでログイン
                </Button>
                <Button 
                  onClick={() => handleSignIn('discord')}
                  disabled={isLoggingIn}
                >
                  Discordでログイン
                </Button>
              </div>
              <AuthDialogNotice onClose={() => setActiveDialog(null)} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
