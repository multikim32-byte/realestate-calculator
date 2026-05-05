import Link from "next/link";
import { notFound } from "next/navigation";
import { posts } from "../data";
import GlobalNav from "../../components/GlobalNav";
import AdUnit from "../../components/AdUnit";
import type { Metadata } from "next";

// AdSense 대시보드 > 광고 > 광고 단위에서 발급받은 슬롯 ID로 교체하세요
const AD_SLOT = "XXXXXXXXXX";

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
    author: { '@type': 'Person', name: '김경래', jobTitle: '공인중개사', url: `${BASE_URL}/about` },
    publisher: { '@type': 'Organization', name: 'mk-land.kr', url: BASE_URL },
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
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "#aaa" }}>{post.date}</span>
            <span style={{ fontSize: 12, color: "#6b7280" }}>·</span>
            <a href="/about" style={{ display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none" }}>
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 22, height: 22, borderRadius: "50%", background: "#1e3a5f",
                color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>김</span>
              <span style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>김경래 공인중개사</span>
            </a>
          </div>
          <h1 style={{ margin: "0 0 20px", fontSize: 24, fontWeight: 800, color: "#1e3a5f", lineHeight: 1.4 }}>
            {post.title}
          </h1>
          <p style={{ margin: "0 0 20px", fontSize: 15, color: "#666", lineHeight: 1.7 }}>
            {post.description}
          </p>

          {/* SNS 유입 사용자 이탈 방지: 핵심 도구 CTA */}
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: "14px 18px", marginBottom: 28, borderBottom: "none" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#1d4ed8", margin: "0 0 10px" }}>🧮 글과 함께 바로 계산해보세요 — 무료</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { href: "/calculator?tab=acquisition", label: "취득세 계산기" },
                { href: "/calculator?tab=loan",        label: "대출 계산기" },
                { href: "/trade",                      label: "실거래가 조회" },
                { href: "/unsold",                     label: "분양정보 보기" },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  style={{
                    padding: "6px 14px", background: "#fff", border: "1px solid #bfdbfe",
                    borderRadius: 20, fontSize: 13, fontWeight: 600, color: "#1d4ed8",
                    textDecoration: "none", whiteSpace: "nowrap",
                  }}
                >
                  {label} →
                </Link>
              ))}
            </div>
          </div>

          <div style={{ borderTop: "1px solid #f0f4f9", paddingTop: 24 }}>
          <div
            style={{ fontSize: 15, color: "#333", lineHeight: 1.9 }}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
          </div>
        </div>

        {/* 광고 */}
        <div style={{ marginTop: 24 }}>
          <AdUnit slotId={AD_SLOT} />
        </div>

        {/* 관련 정보 바로가기 */}
        <div style={{ marginTop: 24, background: "#fff", borderRadius: 16, padding: "20px 20px 18px", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6b7280", fontWeight: 600 }}>🔗 관련 정보 바로가기</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { href: "/trade",      icon: "📊", label: "실거래가 조회",      bg: "#f0fdf4", border: "#86efac", color: "#166534" },
              { href: "/unsold",     icon: "🏗️", label: "전국 분양정보",      bg: "#f5f3ff", border: "#c4b5fd", color: "#5b21b6" },
              { href: "/calendar",   icon: "📅", label: "청약 달력",          bg: "#eff6ff", border: "#93c5fd", color: "#1d4ed8" },
              { href: "/calculator", icon: "🧮", label: "부동산 계산기",      bg: "#fffbeb", border: "#fcd34d", color: "#92400e" },
              { href: "/rental",     icon: "🏢", label: "LH 임대공고",        bg: "#f0fdfa", border: "#6ee7d8", color: "#0f766e" },
            ].map(({ href, icon, label, bg, border, color }) => (
              <Link
                key={href}
                href={href}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "7px 13px", borderRadius: 20,
                  background: bg, border: `1px solid ${border}`,
                  color, fontWeight: 600, fontSize: 13, textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {icon} {label}
              </Link>
            ))}
          </div>
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
