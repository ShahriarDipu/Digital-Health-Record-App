import type { Session } from "next-auth";

export function isAdmin(session: Session | null): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail || !session?.user?.email) return false;
  return session.user.email.toLowerCase() === adminEmail;
}

export function requireAdmin(session: Session | null): { ok: true } | { ok: false; status: number; error: string } {
  if (!session?.user?.id) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!isAdmin(session)) {
    return { ok: false, status: 403, error: "Admin access only" };
  }
  return { ok: true };
}
