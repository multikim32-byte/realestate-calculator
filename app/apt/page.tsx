import Link from "next/link";
import GlobalNav from "../components/GlobalNav";
import { aptPosts } from "./data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "부동산정보 — 청약·분양·세금·대출 완벽 가이드",
  description: "2026년 최신 부동산 정보를 제공합니다. 청약 자격, 취득세, 주담대, 양도세, 전세·월세까지 부동산에 필요한 모든 정보를 알아보세요.",
};

const tagColors: Record<string, { bg: string; color: string }> = {
  청약: { bg: "#e8f0fe", color: "#1a56db" },
  분양: { bg: "#fef3c7", color: "#92400e" },
  세금: { bg: "#fce7f3", color: "#9d174d" },
  대출: { bg: "#d1fae5", color: "#065f46" },
  임대: { bg: "#ede9fe", color: "#5b21b6" },
  투자: { bg: "#fff7ed", color: "#92400e" },
  비용: { bg: "#f3f4f6", color: "#374151" },
};

export default function AptPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f9", fontFamily: "'Apple SD Gothic Neo', sans-serif" }}>
      <GlobalNav />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 60px" }}>

        {/* 헤더 */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: "12px 0 6px", fontSize: 26, fontWeight: 800, color: "#1e3a5f" }}>
            🏠 부동산정보
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "#888" }}>
            청약 · 분양 · 취득세 · 대출 · 세금 · 투자 완벽 가이드
          </p>
        </div>

        {/* 글 목록 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {aptPosts.map((post) => {
            const tagStyle = tagColors[post.tag] || { bg: "#f3f4f6", color: "#374151" };
            return (
              <Link key={post.slug} href={`/apt/${post.slug}`} style={{ textDecoration: "none" }}>
                <div style={{
                  background: "#fff",
                  borderRadius: 16,
                  padding: "24px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                  cursor: "pointer",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                      background: tagStyle.bg, color: tagStyle.color,
                    }}>{post.tag}</span>
                    <span style={{ fontSize: 12, color: "#aaa" }}>{post.date}</span>
                  </div>
                  <h2 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 700, color: "#1e3a5f", lineHeight: 1.4 }}>
                    {post.title}
                  </h2>
                  <p style={{ margin: 0, fontSize: 14, color: "#666", lineHeight: 1.7 }}>
                    {post.description}
                  </p>
                  <div style={{ marginTop: 14, fontSize: 13, color: "#2563eb", fontWeight: 600 }}>
                    자세히 읽기 →
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
