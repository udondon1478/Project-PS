"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { features } from "@/constants/features";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AuthDialogNotice } from "@/components/AuthDialogNotice";

export default function ServiceIntroSection() {
  const { status } = useSession();
  const router = useRouter();
  const [activeDialog, setActiveDialog] = useState<'register' | 'login' | null>(null);

  const handleClick = (e: React.MouseEvent, href: string) => {
    if (status === "unauthenticated") {
      if (href === "/register-item") {
        e.preventDefault();
        setActiveDialog('register');
      } else if (href === "/profile") {
        e.preventDefault();
        setActiveDialog('login');
      }
    }
  };

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
              onClick={(e) => handleClick(e, feature.href)}
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
          {activeDialog === 'register' && (
             <>
              <DialogHeader>
                <DialogTitle>商品登録にはログインが必要です</DialogTitle>
                <DialogDescription>
                  商品登録を行うには、以下のいずれかの方法でログインしてください。
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col space-y-4">
                <Button onClick={() => signIn('google')}>Googleでログイン</Button>
                <Button onClick={() => signIn('discord')}>Discordでログイン</Button>
              </div>
              <AuthDialogNotice onClose={() => setActiveDialog(null)} />
            </>
          )}
          {activeDialog === 'login' && (
             <>
              <DialogHeader>
                <DialogTitle>ログイン</DialogTitle>
                <DialogDescription>
                  以下のいずれかの方法でログインしてください。
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col space-y-4">
                <Button onClick={() => signIn('google')}>Googleでログイン</Button>
                <Button onClick={() => signIn('discord')}>Discordでログイン</Button>
              </div>
              <AuthDialogNotice onClose={() => setActiveDialog(null)} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
