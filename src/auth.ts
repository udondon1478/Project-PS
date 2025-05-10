import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaClient } from "@prisma/client";
 
import Discord from "next-auth/providers/discord";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      const prisma = new PrismaClient();
      try {
        // Check if the user already exists in the database
        if (profile?.email) {
          const existingUser = await prisma.user.findUnique({
            where: { email: profile.email },
          });

          if (!existingUser) {
            // Create a new user in the database
            await prisma.user.create({
              data: {
                email: profile.email,
                name: profile.name ?? null,
                image: typeof profile.image === 'string' ? profile.image : null,
              },
            });
          }

          return true;
        } else {
          console.error("Email not found in profile");
          return false;
        }
      } catch (error) {
        console.error("Error creating user:", error);
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