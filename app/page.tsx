import Link from "next/link";
import Calculator from "./components/Calculator";

export default function Home() {
  return (
    <main>
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "12px 16px 0", display: "flex", justifyContent: "flex-end", gap: 14, flexWrap: "wrap" }}>
        <Link href="/sale" style={{ fontSize: 13, color: "#065f46", fontWeight: 600, textDecoration: "none" }}>
          📋 분양정보
        </Link>
        <Link href="/apt" style={{ fontSize: 13, color: "#1e3a5f", fontWeight: 600, textDecoration: "none" }}>
          🏠 부동산정보
        </Link>
      </div>
      <Calculator />
    </main>
  );
}