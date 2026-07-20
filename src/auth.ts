import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import authConfig from "@/auth.config";
import { logActivity } from "@/lib/activityLog";

function userIsAdmin(email: string | null | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail || !email) return false;
  return email.toLowerCase() === adminEmail;
}

// This full config (Prisma adapter + Credentials/bcrypt) only runs in the
// Node.js runtime (API routes / server components) — never in middleware.
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: {
    // Credentials provider requires JWT sessions (database sessions only
    // work with OAuth providers through the adapter).
    strategy: "jwt",
  },
  providers: [
    ...authConfig.providers,
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "ইমেইল", type: "email" },
        password: { label: "পাসওয়ার্ড", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) {
          throw new Error("ইমেইল ও পাসওয়ার্ড দিন");
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !user.password) {
          throw new Error("ইমেইল বা পাসওয়ার্ড ভুল আছে");
        }

        const passwordsMatch = await bcrypt.compare(password, user.password);

        if (!passwordsMatch) {
          throw new Error("ইমেইল বা পাসওয়ার্ড ভুল আছে");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          address: user.address,
          bloodGroup: user.bloodGroup,
        };
      },
    }),
  ],
  events: {
    async signIn({ user }) {
      if (!user.id) return;
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), lastActiveAt: new Date() },
      });
      logActivity({ userId: user.id, action: "login" });
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.address = user.address;
        token.bloodGroup = user.bloodGroup;
        token.isAdmin = userIsAdmin(user.email);
      } else if (token.email && !token.address) {
        // Keep JWT fresh for OAuth logins where `user` is only passed on first sign-in.
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.address = dbUser.address;
          token.bloodGroup = dbUser.bloodGroup;
          token.isAdmin = userIsAdmin(dbUser.email);
        }
      }
      if (token.email && token.isAdmin === undefined) {
        token.isAdmin = userIsAdmin(token.email as string);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.address = token.address;
        session.user.bloodGroup = token.bloodGroup;
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
});
