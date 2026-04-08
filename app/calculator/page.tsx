import GlobalNav from "../components/GlobalNav";
import Calculator from "../components/Calculator";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "부동산 계산기 — 취득세·대출·중도금·중개수수료 무료 계산 (2026년)",
  description: "2026년 최신 기준 취득세, 주택담보대출 원리금, 중도금 이자, 중개수수료, 수익률을 한 번에 무료로 계산하세요. 생애최초 감면, 원리금균등·원금균등 비교 지원.",
  alternates: { canonical: 'https://www.mk-land.kr/calculator' },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '취득세는 언제 납부해야 하나요?',
      acceptedAnswer: { '@type': 'Answer', text: '잔금 납부일 또는 등기 이전일 중 빠른 날로부터 60일 이내에 신고·납부해야 합니다. 기한 초과 시 20% 가산세가 부과됩니다.' },
    },
    {
      '@type': 'Question',
      name: '원리금균등과 원금균등 중 어떤 상환 방식이 유리한가요?',
      acceptedAnswer: { '@type': 'Answer', text: '총 이자 부담은 원금균등이 더 적습니다. 하지만 원금균등은 초기 월 납입금이 높습니다. 소득이 안정적이라면 원금균등, 월 납입금을 일정하게 유지하고 싶다면 원리금균등을 선택하세요.' },
    },
    {
      '@type': 'Question',
      name: '중도금 대출 이자는 누가 내나요?',
      acceptedAnswer: { '@type': 'Answer', text: '원칙적으로 계약자가 부담합니다. 다만 시행사·건설사가 이자 후불제 또는 무이자 조건을 제공하는 경우도 있으므로 분양 계약서를 확인하세요.' },
    },
    {
      '@type': 'Question',
      name: '생애최초 취득세 감면은 어떻게 신청하나요?',
      acceptedAnswer: { '@type': 'Answer', text: '잔금일 이후 60일 이내 관할 시·군·구청에 취득세 신고 시 생애최초 감면 신청서를 제출합니다. 부부 모두 무주택이어야 하며 최대 200만 원 감면됩니다.' },
    },
    {
      '@type': 'Question',
      name: '중개수수료는 꼭 상한선까지 내야 하나요?',
      acceptedAnswer: { '@type': 'Answer', text: '아닙니다. 법정 요율은 최대 한도이며, 중개사와 협의해 낮은 금액으로 결정할 수 있습니다.' },
    },
  ],
};

export default function CalculatorPage() {
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <GlobalNav />
      <Calculator />

      {/* 사용법 안내 및 상세 설명 */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 20px 60px" }}>

        {/* 서비스 소개 */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e3a5f", marginBottom: 12 }}>부동산 계산기 소개</h2>
          <p style={{ lineHeight: 1.8, color: "#374151", fontSize: 15 }}>
            본 서비스는 주택 매입·분양·임대 등 부동산 거래에 필요한 모든 비용을 빠르고 정확하게 계산할 수 있는 무료 계산기입니다.
            복잡한 세율표나 금융 공식 없이 숫자만 입력하면 즉시 결과를 확인할 수 있으며, 2026년 최신 세율 및 규정을 반영합니다.
          </p>
        </section>

        {/* 대출 상환 계산기 */}
        <section style={{ marginBottom: 48, padding: "28px", background: "#f8faff", borderRadius: 12, border: "1px solid #dbeafe" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e3a5f", marginBottom: 8 }}>대출 원리금 상환 계산기 사용법</h2>
          <p style={{ lineHeight: 1.8, color: "#374151", fontSize: 14, marginBottom: 16 }}>
            주택담보대출, 전세자금대출, 신용대출 등 모든 대출의 월 납입금과 총 이자를 계산합니다.
            원리금균등상환, 원금균등상환, 만기일시상환 세 가지 방식을 비교해 최적의 상환 방식을 선택하세요.
          </p>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1e3a5f", marginBottom: 8 }}>입력 항목</h3>
          <ul style={{ paddingLeft: 20, lineHeight: 2, color: "#374151", fontSize: 14 }}>
            <li><strong>대출 원금:</strong> 실제 빌리는 금액을 입력합니다. (예: 3억 원 → 300,000,000)</li>
            <li><strong>연 이자율:</strong> 은행에서 안내받은 연간 금리를 입력합니다. (예: 4.5%)</li>
            <li><strong>대출 기간:</strong> 대출 만기까지의 기간을 연 단위로 입력합니다. (예: 30년)</li>
            <li><strong>상환 방식:</strong> 원리금균등(매월 동일), 원금균등(초기 부담 크고 점차 감소), 만기일시(이자만 납부 후 만기 일시 상환)</li>
          </ul>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1e3a5f", marginTop: 16, marginBottom: 8 }}>활용 팁</h3>
          <ul style={{ paddingLeft: 20, lineHeight: 2, color: "#374151", fontSize: 14 }}>
            <li>원리금균등 vs 원금균등을 비교해 총 이자 차이를 확인하세요</li>
            <li>금리를 0.1%p씩 조정해 보며 은행 협상 목표 금리를 설정하세요</li>
            <li>월별 상환 내역표로 연차별 잔액 변화를 한눈에 확인할 수 있습니다</li>
          </ul>
        </section>

        {/* 중도금 이자 계산기 */}
        <section style={{ marginBottom: 48, padding: "28px", background: "#f0fdf4", borderRadius: 12, border: "1px solid #bbf7d0" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#14532d", marginBottom: 8 }}>중도금 대출 이자 계산기 사용법</h2>
          <p style={{ lineHeight: 1.8, color: "#374151", fontSize: 14, marginBottom: 16 }}>
            신규 분양 아파트 청약 후 계약금을 납부하고 중도금을 납부하는 단계에서 발생하는 이자를 계산합니다.
            회차별 중도금 납부일과 잔금일을 입력하면 각 회차의 이자와 총 이자 합계를 자동 계산합니다.
          </p>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#14532d", marginBottom: 8 }}>입력 항목</h3>
          <ul style={{ paddingLeft: 20, lineHeight: 2, color: "#374151", fontSize: 14 }}>
            <li><strong>총 분양가:</strong> 분양 계약서에 기재된 공급가액 (부가세 포함 또는 제외 확인 필요)</li>
            <li><strong>회차별 중도금:</strong> 각 회차에 납부하는 중도금 금액 (통상 분양가의 10%씩)</li>
            <li><strong>중도금 대출 이율:</strong> 시행사·건설사가 협약한 은행의 중도금 대출 금리</li>
            <li><strong>잔금일:</strong> 아파트 입주 및 잔금 납부 예정일</li>
            <li><strong>각 회차 납부일:</strong> 분양 계약서에 기재된 중도금 납부 일정</li>
          </ul>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#14532d", marginTop: 16, marginBottom: 8 }}>알아두세요</h3>
          <ul style={{ paddingLeft: 20, lineHeight: 2, color: "#374151", fontSize: 14 }}>
            <li>이자는 각 회차 납부일부터 잔금일까지의 일수를 기준으로 계산됩니다</li>
            <li>무이자 옵션 제공 시 해당 회차는 이자 부담이 없습니다</li>
            <li>잔금일에 주택담보대출로 전환하면 중도금 대출이 상환됩니다</li>
          </ul>
        </section>

        {/* 취득세 계산기 */}
        <section style={{ marginBottom: 48, padding: "28px", background: "#fffbeb", borderRadius: 12, border: "1px solid #fde68a" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#78350f", marginBottom: 8 }}>취득세 계산기 사용법</h2>
          <p style={{ lineHeight: 1.8, color: "#374151", fontSize: 14, marginBottom: 16 }}>
            주택 매입 시 발생하는 취득세를 계산합니다. 주택 가격, 보유 주택 수, 조정대상지역 여부에 따라 세율이 다르게 적용됩니다.
            2026년 최신 세율과 생애최초 취득세 감면 혜택을 반영합니다.
          </p>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#78350f", marginBottom: 8 }}>2026년 취득세율 요약</h3>
          <ul style={{ paddingLeft: 20, lineHeight: 2, color: "#374151", fontSize: 14 }}>
            <li><strong>1주택 (6억 이하):</strong> 1% + 지방교육세 0.1%</li>
            <li><strong>1주택 (6~9억):</strong> 1~3% 누진 + 지방교육세</li>
            <li><strong>1주택 (9억 초과):</strong> 3% + 지방교육세 0.3%</li>
            <li><strong>조정지역 2주택:</strong> 8% 중과</li>
            <li><strong>3주택 이상 (비조정):</strong> 8%, (조정지역) 12%</li>
            <li><strong>생애최초:</strong> 취득세 최대 200만 원 감면</li>
          </ul>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#78350f", marginTop: 16, marginBottom: 8 }}>주의사항</h3>
          <ul style={{ paddingLeft: 20, lineHeight: 2, color: "#374151", fontSize: 14 }}>
            <li>취득세는 잔금일 또는 등기일로부터 60일 이내에 신고·납부해야 합니다</li>
            <li>기한 초과 시 20% 가산세가 부과됩니다</li>
            <li>위택스(wetax.go.kr) 또는 시·군·구청에서 납부 가능합니다</li>
          </ul>
        </section>

        {/* 중개수수료 계산기 */}
        <section style={{ marginBottom: 48, padding: "28px", background: "#fdf4ff", borderRadius: 12, border: "1px solid #e9d5ff" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#581c87", marginBottom: 8 }}>중개수수료 계산기 사용법</h2>
          <p style={{ lineHeight: 1.8, color: "#374151", fontSize: 14, marginBottom: 16 }}>
            부동산 거래 시 공인중개사에게 지급하는 중개보수를 계산합니다. 거래 유형(매매·전세·월세)과 거래 금액에 따라
            법정 요율이 다르게 적용됩니다.
          </p>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#581c87", marginBottom: 8 }}>2026년 주택 중개수수료 요율</h3>
          <ul style={{ paddingLeft: 20, lineHeight: 2, color: "#374151", fontSize: 14 }}>
            <li><strong>매매 5천만 원 미만:</strong> 0.6% 이내 (한도 25만 원)</li>
            <li><strong>매매 5천만~2억 원:</strong> 0.5% 이내 (한도 80만 원)</li>
            <li><strong>매매 2억~9억 원:</strong> 0.4% 이내</li>
            <li><strong>매매 9억 원 이상:</strong> 0.9% 이내 (협의)</li>
            <li><strong>전세 1억~3억 원:</strong> 0.3% 이내</li>
            <li><strong>전세 3억~6억 원:</strong> 0.4% 이내</li>
          </ul>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#581c87", marginTop: 16, marginBottom: 8 }}>알아두세요</h3>
          <ul style={{ paddingLeft: 20, lineHeight: 2, color: "#374151", fontSize: 14 }}>
            <li>중개수수료는 법정 상한 요율 이내에서 중개사와 협의해 결정합니다</li>
            <li>부가가치세(10%)는 별도로 추가될 수 있습니다</li>
            <li>오피스텔·상가는 주택과 다른 요율이 적용됩니다</li>
          </ul>
        </section>

        {/* 수익률 계산기 */}
        <section style={{ marginBottom: 48, padding: "28px", background: "#fff1f2", borderRadius: 12, border: "1px solid #fecdd3" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#881337", marginBottom: 8 }}>수익률 / ROI 계산기 사용법</h2>
          <p style={{ lineHeight: 1.8, color: "#374151", fontSize: 14, marginBottom: 16 }}>
            부동산 투자 수익률을 계산합니다. 매입가, 매도가, 보유 기간, 임대 수입을 입력하면 총수익률과 연평균 수익률(ROI)을 산출합니다.
            투자 전 예상 수익을 미리 시뮬레이션해 보세요.
          </p>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#881337", marginBottom: 8 }}>수익률 계산 방법</h3>
          <ul style={{ paddingLeft: 20, lineHeight: 2, color: "#374151", fontSize: 14 }}>
            <li><strong>시세차익:</strong> (매도가 - 매입가) ÷ 매입가 × 100</li>
            <li><strong>임대수익:</strong> 연간 임대료 ÷ 매입가 × 100</li>
            <li><strong>총수익률:</strong> 시세차익 + 임대수익 합산</li>
            <li><strong>연평균 수익률:</strong> 총수익률 ÷ 보유 기간(년)</li>
          </ul>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#881337", marginTop: 16, marginBottom: 8 }}>투자 판단 기준</h3>
          <ul style={{ paddingLeft: 20, lineHeight: 2, color: "#374151", fontSize: 14 }}>
            <li>임대 수익률 4% 이상이면 일반적으로 안정적인 수익형 투자로 봅니다</li>
            <li>공실 기간, 수선비, 재산세 등 추가 비용을 반영해 실질 수익률을 계산하세요</li>
            <li>레버리지(대출) 활용 시 자기자본 대비 수익률이 높아질 수 있지만 리스크도 증가합니다</li>
          </ul>
        </section>

        {/* FAQ */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e3a5f", marginBottom: 20 }}>자주 묻는 질문 (FAQ)</h2>

          <div style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Q. 취득세는 언제 납부해야 하나요?</h3>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: "#6b7280" }}>
              잔금 납부일 또는 등기 이전일 중 빠른 날로부터 60일 이내에 관할 시·군·구청에 신고·납부해야 합니다.
              기한을 초과하면 납부세액의 20%에 해당하는 가산세가 부과됩니다.
            </p>
          </div>

          <div style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Q. 원리금균등과 원금균등 중 어떤 게 유리한가요?</h3>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: "#6b7280" }}>
              총 이자 부담은 원금균등이 더 적습니다. 하지만 원금균등은 초기 월 납입금이 높아 현금 흐름 부담이 큽니다.
              소득이 안정적이고 초기 부담을 감당할 수 있다면 원금균등, 월 납입금을 일정하게 유지하고 싶다면 원리금균등을 선택하세요.
            </p>
          </div>

          <div style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Q. 중도금 대출 이자는 누가 내나요?</h3>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: "#6b7280" }}>
              원칙적으로 계약자(분양자)가 부담합니다. 다만 시행사·건설사가 이자 일부를 지원하는 "이자 후불제" 또는 "무이자" 조건을
              제공하는 경우도 있습니다. 분양 계약서와 입주자 모집공고를 반드시 확인하세요.
            </p>
          </div>

          <div style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Q. 생애최초 취득세 감면은 어떻게 신청하나요?</h3>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: "#6b7280" }}>
              잔금일 이후 60일 이내 관할 시·군·구청에 취득세 신고 시 생애최초 감면 신청서를 함께 제출합니다.
              부부 중 누구도 주택을 소유한 적 없어야 하며, 실거주 요건(3개월 이내 전입)을 충족해야 합니다.
              최대 200만 원까지 감면되며, 3년 내 매도·임대 시 추징될 수 있습니다.
            </p>
          </div>

          <div style={{ paddingBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Q. 중개수수료는 꼭 법정 상한선까지 내야 하나요?</h3>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: "#6b7280" }}>
              아닙니다. 법정 요율은 최대 한도이며, 중개사와 협의해 낮은 금액으로 결정할 수 있습니다.
              계약 전 수수료를 사전에 협의하고, 중개보수 영수증을 반드시 발급받으세요.
            </p>
          </div>
        </section>

        {/* 관련 글 */}
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e3a5f", marginBottom: 16 }}>관련 부동산 정보</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {[
              { href: "/apt/acquisition-tax-guide", title: "2026년 취득세 완벽 가이드 — 1주택부터 다주택까지", desc: "취득세율 표, 생애최초 감면, 절세 전략 총정리" },
              { href: "/apt/mortgage-loan-guide", title: "2026년 주택담보대출 완벽 가이드", desc: "LTV·DTI·DSR 한도, 은행별 금리 비교, 신청 절차" },
              { href: "/apt/repayment-method-comparison", title: "원리금균등 vs 원금균등 — 어떤 상환 방식이 유리?", desc: "두 방식의 총 이자 차이를 실제 계산으로 비교" },
              { href: "/apt/dsr-calculation-guide", title: "DSR 계산 방법과 대출 한도 늘리는 전략", desc: "DSR 계산식, 예외 상품, 합법적 한도 확장 방법" },
              { href: "/apt/real-estate-brokerage-fee", title: "중개수수료 아끼는 방법 — 합법적 절약 전략", desc: "협상 요령, 직거래 주의사항, 수수료 분쟁 예방" },
            ].map(({ href, title, desc }) => (
              <Link key={href} href={href} style={{ display: "block", padding: "16px 20px", background: "#f9fafb", borderRadius: 10, textDecoration: "none", border: "1px solid #e5e7eb" }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#1e3a5f", marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>{desc}</div>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}
