import { auth } from "@/auth";
import { requireAdmin } from "@/lib/admin";
import {
  batchLastLoginFromLogs,
  batchLoginCounts,
  batchUserActivityStats,
  batchVisitReportCounts,
} from "@/lib/adminUserStats";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  const gate = requireAdmin(session);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      lastLoginAt: true,
      _count: { select: { visits: true } },
    },
  });

  const userIds = users.map((u) => u.id);

  const [activityStats, lastLoginLogs, loginCounts] = await Promise.all([
    batchUserActivityStats(userIds),
    batchLastLoginFromLogs(userIds),
    batchLoginCounts(userIds),
  ]);

  const needsVisitFallback = userIds.filter(
    (id) => !activityStats.get(id)?.hasActivityLogs
  );
  const visitReportCounts = await batchVisitReportCounts(needsVisitFallback);

  const payload = users.map((user) => {
    const stats = activityStats.get(user.id)!;
    const visitCount = user._count.visits;
    const lastLoginAt =
      user.lastLoginAt ?? lastLoginLogs.get(user.id) ?? null;

    const savedScans = stats.hasActivityLogs
      ? stats.savedScans
      : visitReportCounts.get(user.id) ?? 0;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      joinedAt: user.createdAt.toISOString(),
      lastLoginAt: lastLoginAt?.toISOString() ?? null,
      loginCount: loginCounts.get(user.id) ?? 0,
      visitCount,
      labScans: stats.labScans,
      rxScans: stats.rxScans,
      unsavedScans: stats.unsavedScans,
      savedScans,
      status:
        visitCount > 0 || savedScans > 0 || stats.labScans + stats.rxScans > 0
          ? "returning"
          : "new",
    };
  });

  return NextResponse.json(payload);
}
