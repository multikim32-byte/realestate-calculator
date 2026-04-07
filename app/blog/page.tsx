import Link from "next/link";
import GlobalNav from "../components/GlobalNav";
import { posts } from "./data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "부동산 정보 블로그 — 취득세·대출·수익률 완벽 가이드",
  description: "부동산 취득세, 대출 상환 방식, 중도금 이자, 중개수수료, 수익률 계산까지 실전에 필요한 부동산 정보를 알기 쉽게 설명합니다.",
  alternates: { canonical: 'https://www.mk-land.kr/blog' },
};

export default function BlogPage() {
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
          {posts.map((post) => (
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
                transition: "box-shadow 0.2s",
                cursor: "pointer",
              }}>
                <div style={{ fontSize: 12, color: "#aaa", marginBottom: 8 }}>{post.date}</div>
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
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
