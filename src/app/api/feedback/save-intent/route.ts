import { auth } from "@/auth";
import { logActivity } from "@/lib/activityLog";
import { prisma } from "@/lib/prisma";
import {
  isSaveIntentReason,
  type SaveIntentFeedbackEntry,
  type SaveIntentReason,
  type SaveIntentSource,
} from "@/lib/saveIntent";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body as {
    reasons?: unknown;
    choseHealthRecord?: unknown;
    source?: unknown;
  };

  const reasons: SaveIntentReason[] = Array.isArray(raw.reasons)
    ? raw.reasons.filter(
        (r): r is SaveIntentReason => typeof r === "string" && isSaveIntentReason(r)
      )
    : [];

  const choseHealthRecord = raw.choseHealthRecord === true;
  const source: SaveIntentSource | null =
    raw.source === "lab_report" || raw.source === "prescription"
      ? raw.source
      : null;

  if (!source) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }

  if (reasons.length === 0) {
    return NextResponse.json(
      { error: "Select at least one reason" },
      { status: 400 }
    );
  }

  const entry: SaveIntentFeedbackEntry = {
    id: `si-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    reasons,
    choseHealthRecord,
    source,
    createdAt: new Date().toISOString(),
  };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { saveIntentFeedback: true },
  });

  const existing = Array.isArray(user?.saveIntentFeedback)
    ? (user!.saveIntentFeedback as SaveIntentFeedbackEntry[])
    : [];

  const next = [...existing, entry].slice(-50);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { saveIntentFeedback: next },
  });

  logActivity({
    userId: session.user.id,
    action: "save_intent",
    source: "main_tab",
    savedToVisit: choseHealthRecord,
    metadata: {
      summary: choseHealthRecord
        ? "Chose to create health record"
        : "Skipped future benefits",
      reasons,
      choseHealthRecord,
      uploadSource: source,
    },
  });

  return NextResponse.json({ ok: true, entry });
}
