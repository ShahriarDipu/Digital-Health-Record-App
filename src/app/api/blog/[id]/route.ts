import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { slugify } from "@/lib/slugify";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const session = await auth();
  const gate = requireAdmin(session);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await context.params;
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(post);
}

export async function PATCH(req: Request, context: RouteContext) {
  const session = await auth();
  const gate = requireAdmin(session);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await context.params;
  const body = await req.json();

  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const nextSlug = body.slug ? slugify(body.slug) : undefined;
  if (nextSlug && nextSlug !== existing.slug) {
    const clash = await prisma.blogPost.findUnique({ where: { slug: nextSlug } });
    if (clash) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }
  }

  const post = await prisma.blogPost.update({
    where: { id },
    data: {
      ...(nextSlug ? { slug: nextSlug } : {}),
      ...(body.titleBn !== undefined ? { titleBn: String(body.titleBn).trim() } : {}),
      ...(body.titleEn !== undefined ? { titleEn: body.titleEn?.trim() || null } : {}),
      ...(body.excerptBn !== undefined ? { excerptBn: body.excerptBn?.trim() || null } : {}),
      ...(body.excerptEn !== undefined ? { excerptEn: body.excerptEn?.trim() || null } : {}),
      ...(body.contentBn !== undefined ? { contentBn: String(body.contentBn).trim() } : {}),
      ...(body.contentEn !== undefined ? { contentEn: body.contentEn?.trim() || null } : {}),
      ...(body.published !== undefined ? { published: Boolean(body.published) } : {}),
    },
  });

  return NextResponse.json(post);
}

export async function DELETE(_req: Request, context: RouteContext) {
  const session = await auth();
  const gate = requireAdmin(session);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await context.params;

  await prisma.blogPost.delete({ where: { id } }).catch(() => null);

  return NextResponse.json({ ok: true });
}
