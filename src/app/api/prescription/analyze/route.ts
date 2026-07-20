import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { analyzePrescriptionImage } from "@/lib/gemini";
import { publicApiError } from "@/lib/apiError";
import { logActivity, rxScanMetadata, touchUserActive } from "@/lib/activityLog";
import type { Language } from "@/lib/translations";

export const maxDuration = 60;
export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const language = (formData.get("language") as Language) || "bn";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Use JPG, PNG, WEBP, or PDF." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Max 10 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString("base64");

    const prescription = await analyzePrescriptionImage(base64Data, file.type, language);

    const userId = session.user.id;
    if (userId) {
      const source = (formData.get("source") as string) || "main_tab";
      const savedToVisit = formData.get("savedToVisit") === "true";
      logActivity({
        userId,
        action: "rx_scan",
        source: source === "visit_tab" ? "visit_tab" : "main_tab",
        savedToVisit,
        metadata: rxScanMetadata(prescription),
      });
      touchUserActive(userId);
    }

    return NextResponse.json({ prescription }, { status: 200 });
  } catch (error) {
    console.error("Prescription analysis error:", error);
    const message = publicApiError(error, "Failed to analyze prescription");
    const status = message.includes("Gemini API key") || message.includes("Service temporarily") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
