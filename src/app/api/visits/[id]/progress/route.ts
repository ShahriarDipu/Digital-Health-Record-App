import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { dbToVisit } from "@/lib/visitDb";
import { publicApiError } from "@/lib/apiError";
import { NextResponse } from "next/server";
import { generateProgressReport } from "@/lib/gemini";
import type { ProgressReport } from "@/store/useAppStore";
import type { Language } from "@/lib/translations";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const language: Language = body.language || "bn";

    const currentDb = await prisma.visit.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!currentDb) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }
    const current = dbToVisit(currentDb);

    const rootId = current.parentVisitId ?? current.id;

    const allCaseVisits = await prisma.visit.findMany({
      where: {
        userId: session.user.id,
        OR: [{ id: rootId }, { parentVisitId: rootId }],
      },
      orderBy: { visitDate: "asc" },
    });

    const sortedVisits = allCaseVisits.map(dbToVisit);
    const currentIndex = sortedVisits.findIndex((v) => v.id === id);

    if (currentIndex <= 0) {
      return NextResponse.json(
        { error: "No previous visit found to compare" },
        { status: 400 }
      );
    }

    const previousVisit = sortedVisits[currentIndex - 1];

    const progressReport: ProgressReport = await generateProgressReport(
      previousVisit,
      current,
      language
    );

    await prisma.visit.update({
      where: { id },
      data: { progressReport: progressReport as object },
    });

    return NextResponse.json(progressReport);
  } catch (error) {
    console.error("Progress report error:", error);
    const message = publicApiError(error, "Failed to generate progress report");
    const status = message.includes("Gemini API key") || message.includes("Service temporarily") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
