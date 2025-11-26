"use client";

import { signIn } from "next-auth/react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface AuthDropdownProps {
    label: "新規登録" | "ログイン";
}

export default function AuthDropdown({ label }: AuthDropdownProps) {
    const actionText = label === "新規登録" ? "登録" : "ログイン";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                    {label}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={() => signIn("google")}>
                    Googleで{actionText}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signIn("discord")}>
                    Discordで{actionText}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
