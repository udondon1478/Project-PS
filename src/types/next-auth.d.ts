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
            isSafeSearchEnabled: boolean;
        } & DefaultSession["user"];
    }

    interface User {
        role?: Role;
        termsAgreedAt: Date | null;
        isSafeSearchEnabled: boolean;
    }
}

declare module "next-auth/jwt" {
    /**
     * Extends the built-in JWT type to include custom fields
     */
    interface JWT {
        id: string;
        role?: Role;
        termsAgreedAt: Date | null;
        isSafeSearchEnabled: boolean;
    }
}
