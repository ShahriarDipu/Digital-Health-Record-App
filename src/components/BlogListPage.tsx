"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/store/useAppStore";
import { getT } from "@/lib/translations";
import { formatBlogDate } from "@/lib/formatDate";
import { BookOpen, ChevronLeft, ChevronRight, PenLine } from "lucide-react";

interface BlogPostSummary {
  id: string;
  slug: string;
  titleBn: string;
  titleEn: string | null;
  excerptBn: string | null;
  excerptEn: string | null;
  createdAt: string;
}

export default function BlogListPage({
  initialPosts,
  isAdmin = false,
}: {
  initialPosts: BlogPostSummary[];
  isAdmin?: boolean;
}) {
  const { language } = useAppStore();
  const tb = getT(language).blog;
  const [posts] = useState(initialPosts);

  const pick = (bn: string | null | undefined, en: string | null | undefined) => {
    if (language === "bn") return bn || en || "";
    return en || bn || "";
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 pb-16">
      <div className="flex items-start justify-between gap-4 mb-8">
        <Link href="/" className="inline-flex items-center gap-1 text-teal-600 text-sm font-medium hover:text-teal-700">
          <ChevronLeft className="w-4 h-4" />
          {tb.backHome}
        </Link>
        {isAdmin && (
          <Link
            href="/blog/admin"
            className="inline-flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-700"
          >
            <PenLine className="w-4 h-4" />
            {tb.writePost}
          </Link>
        )}
      </div>

      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-800 mb-2">{tb.title}</h1>
        <p className="text-gray-500 text-sm">{tb.subtitle}</p>
      </div>

      {posts.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-gray-100 text-center">
          <BookOpen className="w-12 h-12 text-teal-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">{tb.empty}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="block bg-white rounded-2xl p-5 border border-gray-100 hover:border-teal-200 hover:shadow-md transition-all group"
            >
              <h2 className="font-bold text-gray-800 mb-2 group-hover:text-teal-700 transition-colors">
                {pick(post.titleBn, post.titleEn)}
              </h2>
              <p className="text-gray-500 text-sm line-clamp-2 mb-3">
                {pick(post.excerptBn, post.excerptEn)}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {formatBlogDate(post.createdAt, language)}
                </span>
                <span className="text-teal-600 text-sm font-medium inline-flex items-center gap-1">
                  {tb.readMore}
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
