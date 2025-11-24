import { DefaultSession } from "next-auth";
import { Role } from "@prisma/client";

declare module "next-auth" {
    /**
     * Extends the built-in session and user types to include custom fields
     */
    interface Session {
        user: {
            id: string;
            role?: Role;
            termsAgreedAt: Date | null;
        } & DefaultSession["user"];
    }

    interface User {
        role?: Role;
        termsAgreedAt: Date | null;
    }
}
