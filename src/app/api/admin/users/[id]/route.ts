import { auth } from "@/auth";
import { requireAdmin } from "@/lib/admin";
import {
  buildLoginSessions,
  statsFromLogs,
  type ActivityRow,
} from "@/lib/adminSessions";
import { countReportsInVisits } from "@/lib/activityLog";
import { prisma } from "@/lib/prisma";
import type { SaveIntentFeedbackEntry } from "@/lib/saveIntent";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const gate = requireAdmin(session);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;

  const [user, activityLogs] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        whatsappNumber: true,
        createdAt: true,
        lastLoginAt: true,
        lastActiveAt: true,
        saveIntentFeedback: true,
        _count: { select: { visits: true } },
        visits: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            doctorName: true,
            visitDate: true,
            createdAt: true,
            labReports: true,
            prescription: true,
          },
        },
      },
    }),
    prisma.activityLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: "asc" },
      take: 300,
      select: {
        id: true,
        action: true,
        source: true,
        savedToVisit: true,
        metadata: true,
        createdAt: true,
      },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const reports = countReportsInVisits(user.visits);
  const stats = statsFromLogs(activityLogs);

  const loggedVisitIds = new Set(
    activityLogs
      .filter((log) => log.action === "visit_create")
      .map((log) => {
        const meta = log.metadata as { visitId?: string } | null;
        return meta?.visitId;
      })
      .filter(Boolean)
  );

  const syntheticRows: ActivityRow[] = user.visits
    .filter((visit) => !loggedVisitIds.has(visit.id))
    .map((visit) => ({
      id: `visit-${visit.id}`,
      action: "visit_create",
      source: null,
      savedToVisit: true,
      metadata: {
        doctorName: visit.doctorName,
        visitDate: visit.visitDate,
        synthetic: true,
      },
      createdAt: visit.createdAt.toISOString(),
      synthetic: true,
    }));

  const activityRows: ActivityRow[] = [
    ...activityLogs.map((log) => ({
      id: log.id,
      action: log.action,
      source: log.source,
      savedToVisit: log.savedToVisit,
      metadata: (log.metadata as Record<string, unknown> | null) ?? null,
      createdAt: log.createdAt.toISOString(),
    })),
    ...syntheticRows,
  ];

  const loginSessions = buildLoginSessions(activityRows, {
    joinedAt: user.createdAt.toISOString(),
  });

  const lastLoginFromLogs = activityLogs
    .filter((l) => l.action === "login")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]?.createdAt;

  const saveIntentFeedback = Array.isArray(user.saveIntentFeedback)
    ? (user.saveIntentFeedback as SaveIntentFeedbackEntry[])
    : [];

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      whatsappNumber: user.whatsappNumber,
      joinedAt: user.createdAt.toISOString(),
      lastLoginAt: (user.lastLoginAt ?? lastLoginFromLogs)?.toISOString() ?? null,
      lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
      visitCount: user._count.visits,
      labScans: stats.labScans,
      rxScans: stats.rxScans,
      unsavedScans: stats.unsavedScans,
      savedScans: stats.hasActivityLogs ? stats.savedScans : reports.total,
      reportsInVisits: reports.total,
      saveIntentFeedback,
    },
    loginSessions,
  });
}
