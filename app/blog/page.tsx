import Link from "next/link";
import Image from "next/image";
import GlobalNav from "../components/GlobalNav";
import { posts as filePosts } from "./data";
import { createClient } from '@supabase/supabase-js';
import type { Metadata } from "next";

export const revalidate = 3600; // 1시간마다 재검증

export const metadata: Metadata = {
  title: "부동산 정보 블로그 — 취득세·대출·수익률 완벽 가이드",
  description: "부동산 취득세, 대출 상환 방식, 중도금 이자, 중개수수료, 수익률 계산까지 실전에 필요한 부동산 정보를 알기 쉽게 설명합니다.",
  alternates: { canonical: 'https://www.aptzipsa.kr/blog' },
};

type DbPost = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  thumbnail_url: string | null;
  published_at: string;
};

type CombinedPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  thumbnail_url?: string | null;
  category?: string;
  isDb?: boolean;
};

async function getDbPosts(): Promise<DbPost[]> {
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data } = await db
      .from('blog_posts')
      .select('id, slug, title, description, category, thumbnail_url, published_at')
      .eq('is_published', true)
      .order('published_at', { ascending: false });
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function BlogPage() {
  const dbPosts = await getDbPosts();
  const dbSlugs = new Set(dbPosts.map(p => p.slug));

  // DB 글 + 파일 글 병합 (DB 글 우선, 파일 글 중 중복 슬러그 제외)
  const combined: CombinedPost[] = [
    ...dbPosts.map(p => ({
      slug: p.slug,
      title: p.title,
      description: p.description,
      date: p.published_at.slice(0, 10),
      thumbnail_url: p.thumbnail_url,
      category: p.category,
      isDb: true,
    })),
    ...filePosts
      .filter(p => !dbSlugs.has(p.slug))
      .map(p => ({ slug: p.slug, title: p.title, description: p.description, date: p.date })),
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f9", fontFamily: "'Apple SD Gothic Neo', sans-serif" }}>
      <GlobalNav />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 60px" }}>

        {/* 헤더 */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: "12px 0 6px", fontSize: 26, fontWeight: 800, color: "#1e3a5f" }}>
            🏠 부동산 정보 블로그
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "#888" }}>
            실전에 필요한 부동산 정보를 알기 쉽게 설명합니다
          </p>
        </div>

        {/* 글 목록 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {combined.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              style={{ textDecoration: "none" }}
            >
              <div style={{
                background: "#fff",
                borderRadius: 16,
                padding: "24px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                cursor: "pointer",
                display: "flex",
                gap: 16,
                alignItems: "flex-start",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: "#aaa" }}>{post.date}</span>
                    {post.category && (
                      <span style={{ fontSize: 11, color: "#1d4ed8", background: "#eff6ff", padding: "1px 8px", borderRadius: 10, fontWeight: 700 }}>
                        {post.category}
                      </span>
                    )}
                  </div>
                  <h2 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 700, color: "#1e3a5f", lineHeight: 1.4 }}>
                    {post.title}
                  </h2>
                  <p style={{ margin: 0, fontSize: 14, color: "#666", lineHeight: 1.7 }}>
                    {post.description}
                  </p>
                  <div style={{ marginTop: 16, fontSize: 13, color: "#2563eb", fontWeight: 600 }}>
                    자세히 읽기 →
                  </div>
                </div>
                {post.thumbnail_url && (
                  <div style={{ width: 100, height: 70, borderRadius: 10, overflow: "hidden", flexShrink: 0, position: "relative" }}>
                    <Image src={post.thumbnail_url} alt="" fill style={{ objectFit: "cover" }} />
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
