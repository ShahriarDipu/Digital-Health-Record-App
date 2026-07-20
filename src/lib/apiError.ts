export const AI_ROUTE_MAX_DURATION = 60;

export function publicApiError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback;

  if (message.includes("GEMINI_API_KEY")) {
    return process.env.NODE_ENV === "production"
      ? "Service temporarily unavailable. Please try again later."
      : "Gemini API key is not configured. Add GEMINI_API_KEY to .env.local";
  }

  if (process.env.NODE_ENV === "production") {
    return fallback;
  }

  return message;
}
