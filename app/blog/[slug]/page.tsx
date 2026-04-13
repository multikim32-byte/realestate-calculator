import Link from "next/link";
import { notFound } from "next/navigation";
import { posts } from "../data";
import GlobalNav from "../../components/GlobalNav";
import type { Metadata } from "next";

const BASE_URL = 'https://www.mk-land.kr';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) return {};
  const url = `${BASE_URL}/blog/${slug}`;
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
      siteName: 'mk-land.kr',
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
  return posts.map((p) => ({ slug: p.slug }));
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();

  // 관련 글: 현재 글 제외하고 최대 3개
  const related = posts.filter((p) => p.slug !== slug).slice(0, 3);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Organization', name: '부동산 계산기', url: BASE_URL },
    publisher: { '@type': 'Organization', name: '부동산 계산기', url: BASE_URL },
    url: `${BASE_URL}/blog/${slug}`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${BASE_URL}/blog/${slug}` },
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f9", fontFamily: "'Apple SD Gothic Neo', sans-serif" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <GlobalNav />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 60px" }}>

        {/* 본문 */}
        <div style={{ background: "#fff", borderRadius: 20, padding: "36px 28px", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize: 13, color: "#aaa", marginBottom: 12 }}>{post.date}</div>
          <h1 style={{ margin: "0 0 20px", fontSize: 24, fontWeight: 800, color: "#1e3a5f", lineHeight: 1.4 }}>
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
        <div style={{ marginTop: 24, background: "#2563eb", borderRadius: 16, padding: "24px", textAlign: "center" }}>
          <p style={{ margin: "0 0 12px", color: "#fff", fontWeight: 700, fontSize: 16 }}>
            직접 계산해 보세요
          </p>
          <Link
            href="/"
            style={{
              display: "inline-block",
              background: "#fff",
              color: "#2563eb",
              fontWeight: 700,
              fontSize: 14,
              padding: "10px 24px",
              borderRadius: 30,
              textDecoration: "none",
            }}
          >
            🏠 부동산 계산기 바로가기
          </Link>
        </div>

        {/* 관련 글 */}
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 16, color: "#1e3a5f", fontWeight: 700, marginBottom: 12 }}>관련 글</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {related.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} style={{ textDecoration: "none" }}>
                <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontSize: 14, color: "#1e3a5f", fontWeight: 600, marginBottom: 4 }}>{p.title}</div>
                  <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>{p.description}</div>
                </div>
              </Link>
            ))}
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
