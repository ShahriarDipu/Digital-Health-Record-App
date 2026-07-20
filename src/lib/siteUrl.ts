export function getSiteUrl(): string {
  const url = process.env.AUTH_URL || "https://healthstackbd.com";
  return url.replace(/\/$/, "");
}
