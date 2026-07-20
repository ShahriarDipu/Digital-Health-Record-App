import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity, touchUserActive } from "@/lib/activityLog";
import { NextResponse } from "next/server";

// GET all visits for the current user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const visits = await prisma.visit.findMany({
    where: { userId: session.user.id },
    orderBy: { visitDate: "desc" },
  });

  return NextResponse.json(visits);
}

// POST create a new visit
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { doctorName, visitDate, clinicName, chiefComplaint, visitType, parentVisitId } = body;

  if (!doctorName || !visitDate) {
    return NextResponse.json(
      { error: "doctorName and visitDate are required" },
      { status: 400 }
    );
  }

  const visit = await prisma.visit.create({
    data: {
      userId: session.user.id,
      doctorName,
      visitDate,
      clinicName: clinicName || null,
      chiefComplaint: chiefComplaint || null,
      visitType: visitType || "initial",
      parentVisitId: parentVisitId || null,
    },
  });

  logActivity({
    userId: session.user.id,
    action: "visit_create",
    savedToVisit: true,
    metadata: { doctorName, visitDate, visitId: visit.id },
  });
  touchUserActive(session.user.id);

  return NextResponse.json(visit, { status: 201 });
}
