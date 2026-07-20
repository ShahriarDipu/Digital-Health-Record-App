import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { slugify } from "@/lib/slugify";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  const gate = requireAdmin(session);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = await req.json();
  const {
    slug: rawSlug,
    titleBn,
    titleEn,
    excerptBn,
    excerptEn,
    contentBn,
    contentEn,
    published,
  } = body;

  if (!titleBn?.trim() || !contentBn?.trim()) {
    return NextResponse.json({ error: "titleBn and contentBn are required" }, { status: 400 });
  }

  const slug = slugify(rawSlug || titleEn || titleBn);

  const existing = await prisma.blogPost.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
  }

  const post = await prisma.blogPost.create({
    data: {
      slug,
      titleBn: titleBn.trim(),
      titleEn: titleEn?.trim() || null,
      excerptBn: excerptBn?.trim() || null,
      excerptEn: excerptEn?.trim() || null,
      contentBn: contentBn.trim(),
      contentEn: contentEn?.trim() || null,
      published: Boolean(published),
      authorId: session!.user!.id,
    },
  });

  return NextResponse.json(post, { status: 201 });
}
