import Link from "next/link";
import GlobalNav from "../components/GlobalNav";
import { aptPosts } from "./data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "부동산정보 — 청약·분양·세금·대출 완벽 가이드",
  description: "2026년 최신 부동산 정보를 제공합니다. 청약 자격, 취득세, 주담대, 양도세, 전세·월세까지 부동산에 필요한 모든 정보를 알아보세요.",
  alternates: { canonical: 'https://www.mk-land.kr/apt' },
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

      {/* 헤더 */}
      <div style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", padding: "36px 16px 32px", textAlign: "center" }}>
        <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 800, margin: "0 0 8px" }}>부동산정보</h1>
        <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, margin: 0 }}>
          청약 · 분양 · 취득세 · 대출 · 세금 · 투자 완벽 가이드
        </p>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 60px" }}>

        {/* 소개 문구 */}
        <div style={{ background: "#fff", borderRadius: 12, padding: "18px 22px", marginBottom: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.05)", borderLeft: "4px solid #1d4ed8" }}>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.9, color: "#374151" }}>
            주택 취득세, 주택담보대출, 중도금 이자, 양도소득세, 전세·월세, 청약, 분양, 부동산 투자까지
            부동산 거래에 필요한 모든 정보를 쉽고 자세하게 설명합니다.
            최신 법령과 2026년 기준 세율을 반영한 실용적인 정보를 확인하세요.
          </p>
        </div>

        {/* 글 목록 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {aptPosts.map((post) => {
            const tagStyle = tagColors[post.tag] || { bg: "#f3f4f6", color: "#374151" };
            return (
              <Link key={post.slug} href={`/apt/${post.slug}`} style={{ textDecoration: "none" }}>
                <div className="apt-card" style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: "20px 22px",
                  boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
                  border: "1px solid #e5e7eb",
                  cursor: "pointer",
                  transition: "box-shadow 0.15s, border-color 0.15s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                      background: tagStyle.bg, color: tagStyle.color,
                    }}>{post.tag}</span>
                    <span style={{ fontSize: 12, color: "#aaa" }}>{post.date}</span>
                  </div>
                  <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "#1e3a5f", lineHeight: 1.4 }}>
                    {post.title}
                  </h2>
                  <p style={{ margin: 0, fontSize: 13, color: "#6b7280", lineHeight: 1.7 }}>
                    {post.description}
                  </p>
                  <div style={{ marginTop: 12, fontSize: 13, color: "#2563eb", fontWeight: 600 }}>
                    자세히 읽기 →
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      <style>{`
        .apt-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          border-color: #93c5fd;
        }
      `}</style>
    </div>
  );
}
