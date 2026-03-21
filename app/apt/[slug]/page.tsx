import Link from "next/link";
import { notFound } from "next/navigation";
import { aptPosts } from "../data";
import GlobalNav from "../../components/GlobalNav";
import type { Metadata } from "next";

const BASE_URL = 'https://realestate-calculator.vercel.app';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = aptPosts.find((p) => p.slug === slug);
  if (!post) return {};
  const url = `${BASE_URL}/apt/${slug}`;
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      siteName: '부동산 계산기',
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
}

export function generateStaticParams() {
  return aptPosts.map((p) => ({ slug: p.slug }));
}

const tagColors: Record<string, { bg: string; color: string }> = {
  청약: { bg: "#e8f0fe", color: "#1a56db" },
  분양: { bg: "#fef3c7", color: "#92400e" },
  세금: { bg: "#fce7f3", color: "#9d174d" },
  대출: { bg: "#d1fae5", color: "#065f46" },
  임대: { bg: "#ede9fe", color: "#5b21b6" },
  투자: { bg: "#fff7ed", color: "#92400e" },
  비용: { bg: "#f3f4f6", color: "#374151" },
};

export default async function AptPostPage({ params }: Props) {
  const { slug } = await params;
  const post = aptPosts.find((p) => p.slug === slug);
  if (!post) notFound();

  const tagStyle = tagColors[post.tag] || { bg: "#f3f4f6", color: "#374151" };

  // 같은 태그 우선, 최대 3개
  const related = [
    ...aptPosts.filter((p) => p.slug !== slug && p.tag === post.tag),
    ...aptPosts.filter((p) => p.slug !== slug && p.tag !== post.tag),
  ].slice(0, 3);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Organization', name: '부동산 계산기', url: BASE_URL },
    publisher: { '@type': 'Organization', name: '부동산 계산기', url: BASE_URL },
    url: `${BASE_URL}/apt/${slug}`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${BASE_URL}/apt/${slug}` },
    articleSection: post.tag,
    keywords: `부동산, ${post.tag}, ${post.title}`,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f9", fontFamily: "'Apple SD Gothic Neo', sans-serif" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <GlobalNav />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 60px" }}>

        {/* 본문 */}
        <div style={{ background: "#fff", borderRadius: 20, padding: "36px 28px", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
              background: tagStyle.bg, color: tagStyle.color,
            }}>{post.tag}</span>
            <span style={{ fontSize: 13, color: "#aaa" }}>{post.date}</span>
          </div>
          <h1 style={{ margin: "0 0 16px", fontSize: 24, fontWeight: 800, color: "#1e3a5f", lineHeight: 1.4 }}>
            {post.title}
          </h1>
          <p style={{ margin: "0 0 28px", fontSize: 15, color: "#666", lineHeight: 1.7, borderBottom: "1px solid #f0f4f9", paddingBottom: 24 }}>
            {post.description}
          </p>
          <div
            style={{ fontSize: 15, color: "#333", lineHeight: 1.9 }}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>

        {/* 계산기 유도 */}
        <div style={{ marginTop: 24, background: "#1e3a5f", borderRadius: 16, padding: "24px", textAlign: "center" }}>
          <p style={{ margin: "0 0 12px", color: "#fff", fontWeight: 700, fontSize: 16 }}>
            분양 비용 직접 계산해보기
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/" style={{
              display: "inline-block", background: "#fff", color: "#1e3a5f",
              fontWeight: 700, fontSize: 14, padding: "10px 20px", borderRadius: 30, textDecoration: "none",
            }}>🏠 취득세 계산기</Link>
            <Link href="/" style={{
              display: "inline-block", background: "#2563eb", color: "#fff",
              fontWeight: 700, fontSize: 14, padding: "10px 20px", borderRadius: 30, textDecoration: "none",
            }}>💰 중도금 이자 계산기</Link>
          </div>
        </div>

        {/* 관련 글 */}
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 16, color: "#1e3a5f", fontWeight: 700, marginBottom: 12 }}>관련 글</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {related.map((p) => {
              const ts = tagColors[p.tag] || { bg: "#f3f4f6", color: "#374151" };
              return (
                <Link key={p.slug} href={`/apt/${p.slug}`} style={{ textDecoration: "none" }}>
                  <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: ts.bg, color: ts.color, whiteSpace: "nowrap" }}>{p.tag}</span>
                    </div>
                    <div style={{ fontSize: 14, color: "#1e3a5f", fontWeight: 600, marginBottom: 4 }}>{p.title}</div>
                    <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>{p.description}</div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <Link href="/apt" style={{ fontSize: 14, color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
              부동산 정보 전체 보기 →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
