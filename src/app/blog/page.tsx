import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import BlogListPage from "@/components/BlogListPage";

export const revalidate = 60;

export const metadata = {
  title: "ব্লগ | স্বাস্থ্য সাথী",
  description: "স্বাস্থ্য সম্পর্কিত সহজ বাংলা আর্টিকেল — ল্যাব রিপোর্ট, PCOS, প্রেসক্রিপশন গাইড",
};

export default async function BlogPage() {
  const [posts, session] = await Promise.all([
    prisma.blogPost.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        titleBn: true,
        titleEn: true,
        excerptBn: true,
        excerptEn: true,
        createdAt: true,
      },
    }),
    auth(),
  ]);

  const serialized = posts.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
  }));

  return <BlogListPage initialPosts={serialized} isAdmin={isAdmin(session)} />;
}
