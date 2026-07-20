"use client";

import Link from "next/link";
import { useAppStore } from "@/store/useAppStore";
import { getT } from "@/lib/translations";
import { formatBlogDate } from "@/lib/formatDate";
import BlogArticleBody from "@/components/BlogArticleBody";
import { ChevronLeft } from "lucide-react";

interface BlogPostFull {
  slug: string;
  titleBn: string;
  titleEn: string | null;
  excerptBn: string | null;
  excerptEn: string | null;
  contentBn: string;
  contentEn: string | null;
  createdAt: string;
}

export default function BlogPostView({ post }: { post: BlogPostFull }) {
  const { language } = useAppStore();
  const tb = getT(language).blog;

  const pick = (bn: string | null | undefined, en: string | null | undefined) => {
    if (language === "bn") return bn || en || "";
    return en || bn || "";
  };

  const title = pick(post.titleBn, post.titleEn);
  const content = pick(post.contentBn, post.contentEn);

  return (
    <article className="max-w-3xl mx-auto px-4 py-10 pb-16">
      <Link href="/blog" className="inline-flex items-center gap-1 text-teal-600 text-sm font-medium mb-8 hover:text-teal-700">
        <ChevronLeft className="w-4 h-4" />
        {tb.backToBlog}
      </Link>

      <header className="mb-8">
        <p className="text-xs text-gray-400 mb-3">
          {formatBlogDate(post.createdAt, language)}
        </p>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">{title}</h1>
        {(post.excerptBn || post.excerptEn) && (
          <p className="mt-4 text-gray-600 text-base leading-relaxed">
            {pick(post.excerptBn, post.excerptEn)}
          </p>
        )}
      </header>

      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm">
        <BlogArticleBody content={content} />
      </div>

      <p className="mt-8 text-xs text-gray-400 text-center">{tb.disclaimer}</p>
    </article>
  );
}
