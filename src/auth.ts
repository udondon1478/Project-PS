import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaClient } from "@prisma/client";
 
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ profile, account }) {
      const prisma = new PrismaClient();
      try {
        if (profile?.email && account?.provider && account?.providerAccountId) {
          // Check if the user already exists in the database
          const existingUser = await prisma.user.findUnique({
            where: { email: profile.email },
          });

          if (!existingUser) {
            // Create a new user in the database
            await prisma.user.create({
              data: {
                email: profile.email,
                name: profile.name ?? null,
              },
            });
          }

          // Check if the account already exists in the database
          const existingAccount = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
          });

          if (!existingAccount) {
            // Create a new account in the database
            await prisma.account.create({
              data: {
                userId: existingUser?.id ?? "", // TODO: Handle case where user doesn't exist
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
              },
            });
          } else {
            // Update the account in the database
            await prisma.account.update({
              where: {
                provider_providerAccountId: {
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                },
              },
              data: {
                access_token: account.access_token,
                refresh_token: account.refresh_token,
              },
            });
          }

          return true;
        } else {
          console.error("Email, provider, or providerAccountId not found in profile or account");
          return false;
        }
      } catch (error) {
        console.error("Error creating user or account:", error);
        return false;
      } finally {
        await prisma.$disconnect();
      }
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
      }
      return token;
    },
  },
})