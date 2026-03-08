"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { features, FEATURE_IDS } from "@/constants/features";
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

export default function ServiceIntroSection() {
  const { status } = useSession();
  const [activeDialog, setActiveDialog] = useState<'register' | 'login' | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { t: tHome } = useTranslation('home');
  const { t: tAuth } = useTranslation('auth');
  const { t: tCommon } = useTranslation();

  const DIALOG_CONFIG = {
    register: {
      title: tAuth('dialog.register.title'),
      description: tAuth('dialog.register.description'),
    },
    login: {
      title: tAuth('dialog.login.title'),
      description: tAuth('dialog.login.description'),
    },
  };

  const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, href: string, featureId?: string) => {
    // 豊富な検索条件クリック時はヘッダーを強調表示
    if (featureId === FEATURE_IDS.ADVANCED_SEARCH) {
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
      toast.error(tCommon('error.loginFailed'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const activeConfig = activeDialog ? DIALOG_CONFIG[activeDialog] : null;

  return (
    <>
      <section
        aria-label={tHome('serviceIntro.label')}
        className="mt-4 md:mt-0 mb-12"
      >
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            {tHome('hero.title')}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {tHome('hero.description')}
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
                  <CardTitle className="text-lg">{tHome(feature.titleKey)}</CardTitle>
                  <CardDescription className="whitespace-pre-wrap">{tHome(feature.descriptionKey)}</CardDescription>
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
                  {tAuth('provider.google.login')}
                </Button>
                <Button
                  onClick={() => handleSignIn('discord')}
                  disabled={isLoggingIn}
                >
                  {tAuth('provider.discord.login')}
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
