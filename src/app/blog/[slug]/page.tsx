import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import BlogPostView from "@/components/BlogPostView";

export const revalidate = 60;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({
    where: { slug, published: true },
  });
  if (!post) return { title: "ব্লগ | স্বাস্থ্য সাথী" };
  return {
    title: `${post.titleBn} | স্বাস্থ্য সাথী`,
    description: post.excerptBn || post.excerptEn || undefined,
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({
    where: { slug, published: true },
  });

  if (!post) notFound();

  return (
    <BlogPostView
      post={{
        slug: post.slug,
        titleBn: post.titleBn,
        titleEn: post.titleEn,
        excerptBn: post.excerptBn,
        excerptEn: post.excerptEn,
        contentBn: post.contentBn,
        contentEn: post.contentEn,
        createdAt: post.createdAt.toISOString(),
      }}
    />
  );
}
