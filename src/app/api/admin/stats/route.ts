import { auth } from "@/auth";
import { requireAdmin } from "@/lib/admin";
import { startOfDayUTC, startOfWeekUTC } from "@/lib/adminDates";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  const gate = requireAdmin(session);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const today = startOfDayUTC();
  const weekStart = startOfWeekUTC();

  const [
    totalUsers,
    newUsersToday,
    newUsersWeek,
    loginsToday,
    scansToday,
    visitsToday,
    totalVisits,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: today } } }),
    prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.activityLog.count({
      where: { action: "login", createdAt: { gte: today } },
    }),
    prisma.activityLog.count({
      where: {
        action: { in: ["lab_scan", "rx_scan"] },
        createdAt: { gte: today },
      },
    }),
    prisma.activityLog.count({
      where: { action: "visit_create", createdAt: { gte: today } },
    }),
    prisma.visit.count(),
  ]);

  return NextResponse.json({
    totalUsers,
    newUsersToday,
    newUsersWeek,
    loginsToday,
    scansToday,
    visitsToday,
    totalVisits,
  });
}
