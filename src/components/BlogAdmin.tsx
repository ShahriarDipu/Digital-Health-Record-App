"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { getT } from "@/lib/translations";
import {
  ChevronLeft,
  Loader2,
  Sparkles,
  Save,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";

interface ManagePost {
  id: string;
  slug: string;
  titleBn: string;
  titleEn: string | null;
  excerptBn: string | null;
  excerptEn: string | null;
  published: boolean;
  createdAt: string;
}

interface Draft {
  id?: string;
  slug: string;
  titleBn: string;
  titleEn: string;
  excerptBn: string;
  excerptEn: string;
  contentBn: string;
  contentEn: string;
  published: boolean;
}

const emptyDraft = (): Draft => ({
  slug: "",
  titleBn: "",
  titleEn: "",
  excerptBn: "",
  excerptEn: "",
  contentBn: "",
  contentEn: "",
  published: false,
});

export default function BlogAdmin() {
  const { language } = useAppStore();
  const tb = getT(language).blog;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [posts, setPosts] = useState<ManagePost[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadPosts = useCallback(async () => {
    const res = await fetch("/api/blog/manage");
    if (res.status === 403 || res.status === 401) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setError(tb.loadError);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setPosts(data);
    setLoading(false);
  }, [tb.loadError]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  const loadPostForEdit = async (id: string) => {
    setError("");
    const summary = posts.find((p) => p.id === id);
    if (!summary) return;

    const res = await fetch(`/api/blog/${id}`);
    if (!res.ok) {
      setDraft({
        id: summary.id,
        slug: summary.slug,
        titleBn: summary.titleBn,
        titleEn: summary.titleEn || "",
        excerptBn: summary.excerptBn || "",
        excerptEn: summary.excerptEn || "",
        contentBn: "",
        contentEn: "",
        published: summary.published,
      });
      return;
    }

    const full = await res.json();
    setDraft({
      id: full.id,
      slug: full.slug,
      titleBn: full.titleBn,
      titleEn: full.titleEn || "",
      excerptBn: full.excerptBn || "",
      excerptEn: full.excerptEn || "",
      contentBn: full.contentBn || "",
      contentEn: full.contentEn || "",
      published: full.published,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/blog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setDraft({
        ...emptyDraft(),
        slug: data.slug,
        titleBn: data.titleBn,
        titleEn: data.titleEn,
        excerptBn: data.excerptBn,
        excerptEn: data.excerptEn,
        contentBn: data.contentBn,
        contentEn: data.contentEn,
      });
      setSuccess(tb.generated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async (asPublished?: boolean) => {
    setSaving(true);
    setError("");
    setSuccess("");
    const willPublish = asPublished ?? draft.published;
    try {
      const payload = {
        slug: draft.slug,
        titleBn: draft.titleBn,
        titleEn: draft.titleEn,
        excerptBn: draft.excerptBn,
        excerptEn: draft.excerptEn,
        contentBn: draft.contentBn,
        contentEn: draft.contentEn,
        published: willPublish,
      };

      const res = draft.id
        ? await fetch(`/api/blog/${draft.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/blog", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      setDraft({
        id: data.id,
        slug: data.slug,
        titleBn: data.titleBn,
        titleEn: data.titleEn || "",
        excerptBn: data.excerptBn || "",
        excerptEn: data.excerptEn || "",
        contentBn: data.contentBn,
        contentEn: data.contentEn || "",
        published: data.published,
      });
      setSuccess(data.published ? tb.savedPublished : tb.savedDraft);
      await loadPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!draft.id || !confirm(tb.deleteConfirm)) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/blog/${draft.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setDraft(emptyDraft());
      setSuccess(tb.deleted);
      await loadPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 flex justify-center">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-800 mb-2">{tb.adminOnly}</h1>
        <p className="text-gray-500 text-sm mb-6">{tb.adminOnlyDesc}</p>
        <Link href="/blog" className="text-teal-600 font-medium text-sm">
          {tb.backToBlog}
        </Link>
      </div>
    );
  }

  const field = (label: string, key: keyof Draft, rows = 1) => (
    <label className="block">
      <span className="text-xs font-semibold text-gray-600 mb-1 block">{label}</span>
      {rows > 1 ? (
        <textarea
          value={String(draft[key])}
          onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
          rows={rows}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      ) : (
        <input
          value={String(draft[key])}
          onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      )}
    </label>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-16">
      <Link href="/blog" className="inline-flex items-center gap-1 text-teal-600 text-sm font-medium mb-6 hover:text-teal-700">
        <ChevronLeft className="w-4 h-4" />
        {tb.backToBlog}
      </Link>

      <h1 className="text-2xl font-black text-gray-800 mb-6">{tb.adminTitle}</h1>

      {/* AI Generate */}
      <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-2xl p-5 mb-6">
        <h2 className="font-bold text-teal-900 text-sm mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          {tb.aiGenerate}
        </h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={tb.topicPlaceholder}
            className="flex-1 border border-teal-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={generating || !topic.trim()}
            className="flex items-center justify-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? tb.generating : tb.generateBtn}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">{success}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor */}
        <div className="lg:col-span-2 space-y-4 bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="font-bold text-gray-800 text-sm">{draft.id ? tb.editPost : tb.newPost}</h2>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold w-fit ${
              draft.published ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
            }`}>
              {draft.published ? (
                <><Eye className="w-3.5 h-3.5" />{tb.published}</>
              ) : (
                <><EyeOff className="w-3.5 h-3.5" />{tb.draft}</>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-500 -mt-2">{tb.publishHint}</p>

          {field("Slug (URL)", "slug")}
          {field(tb.titleBn, "titleBn")}
          {field(tb.titleEn, "titleEn")}
          {field(tb.excerptBn, "excerptBn", 2)}
          {field(tb.excerptEn, "excerptEn", 2)}
          {field(tb.contentBn, "contentBn", 12)}
          {field(tb.contentEn, "contentEn", 12)}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={() => void handleSave(true)}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              {tb.publishBtn}
            </button>
            <button
              type="button"
              onClick={() => void handleSave(false)}
              disabled={saving}
              className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {tb.saveDraft}
            </button>
            {draft.id && (
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-100"
              >
                <Trash2 className="w-4 h-4" />
                {tb.delete}
              </button>
            )}
            {draft.slug && draft.published && (
              <button
                type="button"
                onClick={() => router.push(`/blog/${draft.slug}`)}
                className="inline-flex items-center gap-2 border border-gray-200 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                {tb.preview}
              </button>
            )}
            <button
              type="button"
              onClick={() => setDraft(emptyDraft())}
              className="text-sm text-gray-500 hover:text-gray-700 px-3"
            >
              {tb.newPost}
            </button>
          </div>
        </div>

        {/* Post list */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 h-fit">
          <h2 className="font-bold text-gray-800 text-sm mb-3">{tb.allPosts}</h2>
          {posts.length === 0 ? (
            <p className="text-gray-400 text-sm">{tb.empty}</p>
          ) : (
            <ul className="space-y-2">
              {posts.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => void loadPostForEdit(p.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                      draft.id === p.id ? "bg-teal-50 border border-teal-200" : "hover:bg-gray-50 border border-transparent"
                    }`}
                  >
                    <p className="font-medium text-gray-800 truncate">{p.titleBn}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {p.published ? tb.published : tb.draft} · /{p.slug}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
