import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.reminder.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: {
    active?: boolean;
    times?: string[];
    medicineName?: string;
    notifyBeforeMinutes?: number;
    mutedTimes?: string[];
  } = {};

  if (typeof body.active === "boolean") data.active = body.active;
  if (Array.isArray(body.times)) data.times = body.times;
  if (typeof body.medicineName === "string") data.medicineName = body.medicineName;
  if (typeof body.notifyBeforeMinutes === "number") {
    data.notifyBeforeMinutes = Math.max(0, Math.min(60, body.notifyBeforeMinutes));
  }
  if (Array.isArray(body.mutedTimes)) data.mutedTimes = body.mutedTimes;

  const updated = await prisma.reminder.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.reminder.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.reminder.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
