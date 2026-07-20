import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  const gate = requireAdmin(session);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const posts = await prisma.blogPost.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      titleBn: true,
      titleEn: true,
      excerptBn: true,
      excerptEn: true,
      published: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(posts);
}
