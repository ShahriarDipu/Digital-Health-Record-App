import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity, touchUserActive } from "@/lib/activityLog";
import { NextResponse } from "next/server";

function prescriptionCount(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return 1;
  return 0;
}

function labReportCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

// PATCH update a visit (prescription, labReports, healthReport, lifestyleDirections)
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
  const activitySource = body.activitySource as string | undefined;
  delete body.activitySource;

  const existing = await prisma.visit.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Visit not found" }, { status: 404 });
  }

  const updated = await prisma.visit.update({
    where: { id },
    data: {
      ...(body.doctorName !== undefined && { doctorName: body.doctorName }),
      ...(body.visitDate !== undefined && { visitDate: body.visitDate }),
      ...(body.clinicName !== undefined && { clinicName: body.clinicName }),
      ...(body.chiefComplaint !== undefined && {
        chiefComplaint: body.chiefComplaint,
      }),
      ...(body.prescription !== undefined && {
        prescription: body.prescription,
      }),
      ...(body.labReports !== undefined && { labReports: body.labReports }),
      ...(body.healthReport !== undefined && {
        healthReport: body.healthReport,
      }),
      ...(body.lifestyleDirections !== undefined && {
        lifestyleDirections: body.lifestyleDirections,
      }),
      ...(body.progressReport !== undefined && {
        progressReport: body.progressReport,
      }),
      ...(body.lastAnalysisFingerprint !== undefined && {
        lastAnalysisFingerprint: body.lastAnalysisFingerprint,
      }),
    },
  });

  if (activitySource === "save_modal" || activitySource === "main_tab") {
    const source = activitySource === "main_tab" ? "main_tab" : "save_modal";
    if (body.prescription !== undefined) {
      const added = prescriptionCount(body.prescription) - prescriptionCount(existing.prescription);
      if (added > 0) {
        logActivity({
          userId: session.user.id,
          action: "rx_saved",
          source,
          savedToVisit: true,
          metadata: { visitId: id, added },
        });
      }
    }
    if (body.labReports !== undefined) {
      const added = labReportCount(body.labReports) - labReportCount(existing.labReports);
      if (added > 0) {
        logActivity({
          userId: session.user.id,
          action: "lab_saved",
          source,
          savedToVisit: true,
          metadata: { visitId: id, added },
        });
      }
    }
    touchUserActive(session.user.id);
  }

  return NextResponse.json(updated);
}

// DELETE a visit
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.visit.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Visit not found" }, { status: 404 });
  }

  await prisma.visit.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
