import Link from "next/link";
import { notFound } from "next/navigation";
import { posts } from "../data";
import GlobalNav from "../../components/GlobalNav";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) return {};
  return {
    title: post.title + " | 부동산 계산기",
    description: post.description,
  };
}

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f9", fontFamily: "'Apple SD Gothic Neo', sans-serif" }}>
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

        {/* 다른 글 */}
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 15, color: "#1e3a5f", fontWeight: 700, marginBottom: 12 }}>다른 글 보기</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {posts.filter((p) => p.slug !== slug).map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} style={{ textDecoration: "none" }}>
                <div style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontSize: 14, color: "#1e3a5f", fontWeight: 600 }}>{p.title}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
