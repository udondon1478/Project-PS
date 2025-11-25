
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { toast } from "sonner";

export default function AgreementPage() {
    const [agreed, setAgreed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const { update } = useSession(); // Get update function

    const handleSubmit = async () => {
        if (!agreed) return;

        setIsLoading(true);
        try {
            const response = await fetch("/api/auth/agree", {
                method: "POST",
            });

            if (!response.ok) {
                throw new Error("Something went wrong");
            }

            // Force session update to reflect new termsAgreedAt before navigation
            await update();
            toast.success("利用規約に同意しました");
            router.push("/"); // Redirect to home after session update
        } catch (error) {
            console.error(error);
            toast.error("エラーが発生しました。もう一度お試しください。");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>利用規約とプライバシーポリシーへの同意</CardTitle>
                    <CardDescription>
                        サービスの利用を開始するには、以下の規約に同意する必要があります。
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        <p>
                            <Link href="/terms" className="text-blue-600 hover:underline" target="_blank">
                                利用規約
                            </Link>
                            {' '}と{' '}
                            <Link href="/privacy" className="text-blue-600 hover:underline" target="_blank">
                                プライバシーポリシー
                            </Link>
                            {' '}の内容を確認し、同意の上でチェックを入れてください。
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="terms"
                            checked={agreed}
                            onCheckedChange={(checked) => setAgreed(checked as boolean)}
                        />
                        <Label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            利用規約とプライバシーポリシーに同意する
                        </Label>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        className="w-full"
                        onClick={handleSubmit}
                        disabled={!agreed || isLoading}
                    >
                        {isLoading ? "処理中..." : "同意して始める"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
