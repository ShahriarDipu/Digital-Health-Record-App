import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reminders = await prisma.reminder.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(reminders);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { medicineName, times, active, doctorName, visitId, notifyBeforeMinutes, mutedTimes } = body;

  if (!medicineName || !times) {
    return NextResponse.json(
      { error: "medicineName and times are required" },
      { status: 400 }
    );
  }

  // Prevent duplicates: if same medicineName+visitId already exists, return existing
  if (visitId) {
    const existing = await prisma.reminder.findFirst({
      where: { userId: session.user.id, medicineName, visitId },
    });
    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }
  }

  const reminder = await prisma.reminder.create({
    data: {
      userId: session.user.id,
      medicineName,
      times,
      active: active ?? true,
      notifyBeforeMinutes: typeof notifyBeforeMinutes === "number" ? notifyBeforeMinutes : 0,
      mutedTimes: Array.isArray(mutedTimes) ? mutedTimes : [],
      doctorName: doctorName || null,
      visitId: visitId || null,
    },
  });

  return NextResponse.json(reminder, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const visitId = searchParams.get("visitId");

  if (!visitId) {
    return NextResponse.json({ error: "visitId is required" }, { status: 400 });
  }

  await prisma.reminder.deleteMany({
    where: { userId: session.user.id, visitId },
  });

  return NextResponse.json({ success: true });
}
