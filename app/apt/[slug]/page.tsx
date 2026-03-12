import Link from "next/link";
import { notFound } from "next/navigation";
import { aptPosts } from "../data";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = aptPosts.find((p) => p.slug === slug);
  if (!post) return {};
  return {
    title: post.title + " | 아파트 분양 정보",
    description: post.description,
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

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f9", fontFamily: "'Apple SD Gothic Neo', sans-serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 60px" }}>

        {/* 네비게이션 */}
        <div style={{ marginBottom: 24, display: "flex", gap: 16 }}>
          <Link href="/sale" style={{ fontSize: 13, color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>📋 분양정보</Link>
          <Link href="/" style={{ fontSize: 13, color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>🏠 계산기</Link>
          <Link href="/apt" style={{ fontSize: 13, color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>🏠 부동산정보</Link>
        </div>

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

        {/* 다른 글 */}
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 15, color: "#1e3a5f", fontWeight: 700, marginBottom: 12 }}>다른 분양 정보</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {aptPosts.filter((p) => p.slug !== slug).map((p) => {
              const ts = tagColors[p.tag] || { bg: "#f3f4f6", color: "#374151" };
              return (
                <Link key={p.slug} href={`/apt/${p.slug}`} style={{ textDecoration: "none" }}>
                  <div style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: ts.bg, color: ts.color, whiteSpace: "nowrap" }}>{p.tag}</span>
                    <span style={{ fontSize: 14, color: "#1e3a5f", fontWeight: 600 }}>{p.title}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
