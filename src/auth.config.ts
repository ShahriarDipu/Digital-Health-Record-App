import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-safe Auth.js config used by middleware.
 * Must NOT import Prisma or bcryptjs — those need the Node.js runtime
 * and are wired in separately inside `src/auth.ts` for API routes.
 *
 * Google provider stays enabled here (backend). To hide Google buttons in UI,
 * see AuthLoginForm.tsx and AuthRegisterForm.tsx (commented SOCIAL LOGIN blocks).
 */
export default {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
