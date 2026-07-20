import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateHealthReport } from "@/lib/gemini";
import { publicApiError } from "@/lib/apiError";
import type { Prescription, LabReport } from "@/store/useAppStore";
import type { Language } from "@/lib/translations";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as {
      prescription: Prescription;
      labReports: LabReport[];
      language: Language;
    };

    if (!body.prescription || !Array.isArray(body.labReports) || body.labReports.length === 0) {
      return NextResponse.json(
        { error: "Prescription and at least one lab report are required" },
        { status: 400 }
      );
    }

    const result = await generateHealthReport(body.prescription, body.labReports, body.language || "bn");

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Health report generation error:", error);
    const message = publicApiError(error, "Failed to generate health report");
    const status = message.includes("Gemini API key") || message.includes("Service temporarily") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
