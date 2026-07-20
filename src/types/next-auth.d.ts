import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      address?: string | null;
      bloodGroup?: string | null;
      isAdmin?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    address?: string | null;
    bloodGroup?: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    address?: string | null;
    bloodGroup?: string | null;
    isAdmin?: boolean;
  }
}
