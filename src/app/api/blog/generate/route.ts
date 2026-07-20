import { auth } from "@/auth";
import { requireAdmin } from "@/lib/admin";
import { generateBlogArticle } from "@/lib/gemini";
import { publicApiError } from "@/lib/apiError";
import { NextResponse } from "next/server";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  const gate = requireAdmin(session);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = await req.json();
  const topic = String(body.topic || "").trim();

  if (!topic) {
    return NextResponse.json({ error: "topic is required" }, { status: 400 });
  }

  try {
    const article = await generateBlogArticle(topic);
    return NextResponse.json(article);
  } catch (err) {
    console.error("Blog generation error:", err);
    const message = publicApiError(err, "Generation failed");
    const status = message.includes("Gemini API key") || message.includes("Service temporarily") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
