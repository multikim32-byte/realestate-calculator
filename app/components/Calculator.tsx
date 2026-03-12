"use client";
// ← 이 코드 전체를 복사해서 components/Calculator.tsx 에 붙여넣으세요

import { useState, useMemo } from "react";

const tabs = [
  { id: "loan", label: "대출 상환" },
  { id: "intermediate", label: "중도금 이자" },
  { id: "acquisition", label: "취득세" },
  { id: "brokerage", label: "중개수수료" },
  { id: "roi", label: "수익률" },
];

const fmt = (n: number) => Math.round(n).toLocaleString("ko-KR");
const won = (n: number) => `${fmt(n)}원`;
const parseWon = (v: string) => parseFloat(v.replace(/,/g, "")) || 0;
const fmtInput = (v: string) => {
  const raw = v.replace(/[^0-9]/g, "");
  return raw === "" ? "" : parseInt(raw).toLocaleString("ko-KR");
};

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "28px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginTop: 20 }}>
      {title && <h3 style={{ margin: "0 0 20px", fontSize: 16, color: "#1e3a5f", fontWeight: 700 }}>{title}</h3>}
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 13, color: "#666", marginBottom: 6, fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #e0e7ef",
  fontSize: 15, outline: "none", boxSizing: "border-box", color: "#222",
};
const selectStyle: React.CSSProperties = { ...inputStyle, background: "#fff", cursor: "pointer" };

function WonInput({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ position: "relative" }}>
      <input
        style={{ ...inputStyle, paddingRight: 36 }}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(fmtInput(e.target.value))}
      />
      <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#aaa" }}>원</span>
    </div>
  );
}

function ResultRow({ label, value, highlight, sub }: { label: string; value: string; highlight?: boolean; sub?: string }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "12px 16px", borderRadius: 8, marginBottom: 8,
      background: highlight ? "#2563eb" : "#f4f7fb",
    }}>
      <div>
        <span style={{ fontSize: 14, color: highlight ? "#fff" : "#555", fontWeight: highlight ? 700 : 400 }}>{label}</span>
        {sub && <div style={{ fontSize: 11, color: highlight ? "rgba(255,255,255,0.75)" : "#aaa", marginTop: 2 }}>{sub}</div>}
      </div>
      <span style={{ fontSize: highlight ? 17 : 15, fontWeight: 700, color: highlight ? "#fff" : "#1e3a5f" }}>{value}</span>
    </div>
  );
}

function CalcBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", padding: "13px", borderRadius: 10, background: "#2563eb",
      color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer", marginTop: 8,
    }}>계산하기</button>
  );
}

// 월별 상환 테이블
type ScheduleRow = { month: number; payment: number; principal: number; interest: number; balance: number };

function AmortizationTable({ schedule }: { schedule: ScheduleRow[] }) {
  const [page, setPage] = useState(1);
  const [yearOnly, setYearOnly] = useState(false);
  const PER = 12;

  const display = useMemo(() => {
    if (!yearOnly) return schedule;
    const years: Record<number, any> = {};
    schedule.forEach(r => {
      const y = Math.ceil(r.month / 12);
      if (!years[y]) years[y] = { month: y, label: `${y}년차`, principal: 0, interest: 0, payment: 0, balance: r.balance };
      years[y].principal += r.principal;
      years[y].interest += r.interest;
      years[y].payment += r.payment;
      years[y].balance = r.balance;
    });
    return Object.values(years);
  }, [schedule, yearOnly]);

  const totalPages = Math.ceil(display.length / PER);
  const slice = display.slice((page - 1) * PER, page * PER);

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#1e3a5f" }}>월별 상환 내역</span>
        <button onClick={() => { setYearOnly(v => !v); setPage(1); }} style={{
          padding: "5px 12px", borderRadius: 20, border: "1.5px solid #2563eb",
          background: yearOnly ? "#2563eb" : "#fff", color: yearOnly ? "#fff" : "#2563eb",
          fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>{yearOnly ? "월별 보기" : "연도별 보기"}</button>
      </div>
      <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #e0e7ef" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f0f4f9" }}>
              <th style={th}>회차</th><th style={th}>납입금</th>
              <th style={{ ...th, color: "#2563eb" }}>원금</th>
              <th style={{ ...th, color: "#e25c3a" }}>이자</th>
              <th style={th}>잔액</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((r: any, i: number) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfd" }}>
                <td style={td}>{yearOnly ? r.label : `${r.month}회`}</td>
                <td style={td}>{fmt(r.payment)}</td>
                <td style={{ ...td, color: "#2563eb", fontWeight: 600 }}>{fmt(r.principal)}</td>
                <td style={{ ...td, color: "#e25c3a" }}>{fmt(r.interest)}</td>
                <td style={{ ...td, color: "#555" }}>{fmt(r.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 12 }}>
          <PageBtn onClick={() => setPage(1)} disabled={page === 1}>«</PageBtn>
          <PageBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</PageBtn>
          <span style={{ fontSize: 13, color: "#555" }}>{page} / {totalPages}</span>
          <PageBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</PageBtn>
          <PageBtn onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</PageBtn>
        </div>
      )}
    </div>
  );
}

function PageBtn({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: 30, height: 30, borderRadius: 6, border: "1.5px solid #e0e7ef",
      background: disabled ? "#f4f7fb" : "#fff", color: disabled ? "#bbb" : "#2563eb",
      fontWeight: 700, fontSize: 14, cursor: disabled ? "default" : "pointer",
    }}>{children}</button>
  );
}

const th: React.CSSProperties = { padding: "10px", textAlign: "right", fontWeight: 700, color: "#555", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "9px 10px", textAlign: "right", whiteSpace: "nowrap" };

// 1. 대출 상환
function LoanCalc() {
  const [amt, setAmt] = useState("");
  const [rate, setRate] = useState("");
  const [years, setYears] = useState("");
  const [type, setType] = useState("equal");
  const [result, setResult] = useState<any>(null);

  const calc = () => {
    const P = parseWon(amt), r = parseFloat(rate) / 100 / 12, n = parseFloat(years) * 12;
    if (!P || !r || !n) return;
    let schedule: ScheduleRow[] = [];
    if (type === "equal") {
      const monthly = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
      let balance = P;
      for (let i = 1; i <= n; i++) {
        const interest = balance * r, principal = monthly - interest;
        balance = Math.max(0, balance - principal);
        schedule.push({ month: i, payment: monthly, principal, interest, balance });
      }
      setResult({ monthly, total: monthly * n, interest: monthly * n - P, type: "equal", schedule });
    } else {
      const principal = P / n; let balance = P, totalInterest = 0;
      for (let i = 1; i <= n; i++) {
        const interest = balance * r, payment = principal + interest;
        balance = Math.max(0, balance - principal); totalInterest += interest;
        schedule.push({ month: i, payment, principal, interest, balance });
      }
      setResult({ principal, firstMonth: schedule[0].payment, lastMonth: schedule[n - 1].payment, totalInterest, total: P + totalInterest, type: "reducing", schedule });
    }
  };

  return (
    <>
      <Card title="대출 원리금 상환 계산">
        <Field label="대출 금액"><WonInput placeholder="예: 300,000,000" value={amt} onChange={setAmt} /></Field>
        <Field label="연 이자율 (%)"><input style={inputStyle} type="number" placeholder="예: 4.5" value={rate} onChange={e => setRate(e.target.value)} /></Field>
        <Field label="대출 기간 (년)"><input style={inputStyle} type="number" placeholder="예: 30" value={years} onChange={e => setYears(e.target.value)} /></Field>
        <Field label="상환 방식">
          <select style={selectStyle} value={type} onChange={e => setType(e.target.value)}>
            <option value="equal">원리금균등상환</option>
            <option value="reducing">원금균등상환</option>
          </select>
        </Field>
        <CalcBtn onClick={calc} />
        {result && (
          <div style={{ marginTop: 20 }}>
            {result.type === "equal" ? (
              <><ResultRow label="월 납입금" value={won(result.monthly)} highlight /><ResultRow label="총 납입금" value={won(result.total)} /><ResultRow label="총 이자" value={won(result.interest)} /></>
            ) : (
              <><ResultRow label="첫 달 납입금" value={won(result.firstMonth)} highlight /><ResultRow label="마지막 달 납입금" value={won(result.lastMonth)} /><ResultRow label="총 이자" value={won(result.totalInterest)} /><ResultRow label="총 납입금" value={won(result.total)} /></>
            )}
          </div>
        )}
      </Card>
      {result && <Card><AmortizationTable schedule={result.schedule} /></Card>}
    </>
  );
}

// 2. 중도금 이자
function IntermediateCalc() {
  const [salePrice, setSalePrice] = useState("");
  const [ratio, setRatio] = useState("60");
  const [rate, setRate] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [count, setCount] = useState("6");
  const [payDates, setPayDates] = useState(["", "", "", "", "", ""]);
  const [result, setResult] = useState<any>(null);
  const cnt = parseInt(count);

  const updatePayDate = (i: number, v: string) => {
    const arr = [...payDates]; arr[i] = v; setPayDates(arr);
  };

  const calc = () => {
    const total = parseWon(salePrice), r = parseFloat(rate) / 100 / 12;
    if (!moveInDate || !total || !r) return;
    const moveIn = new Date(moveInDate);
    const intermediate = total * parseFloat(ratio) / 100;
    const perPayment = intermediate / cnt;
    let totalInterest = 0;
    const payments = [];
    for (let i = 0; i < cnt; i++) {
      const pd = payDates[i] ? new Date(payDates[i]) : null;
      const diffDays = pd ? Math.max(0, Math.round((moveIn.getTime() - pd.getTime()) / 86400000)) : null;
      const remainMonths = diffDays !== null ? diffDays / 30.4375 : null;
      const paid = perPayment * (i + 1);
      const interest = remainMonths !== null ? paid * r * remainMonths : null;
      if (interest !== null) totalInterest += interest;
      payments.push({ round: i + 1, paid, interest, diffDays, date: payDates[i] });
    }
    setResult({ intermediate, totalInterest, perPayment, payments });
  };

  return (
    <Card title="중도금 이자 계산">
      <Field label="분양가"><WonInput placeholder="예: 500,000,000" value={salePrice} onChange={setSalePrice} /></Field>
      <Field label="중도금 비율">
        <select style={selectStyle} value={ratio} onChange={e => setRatio(e.target.value)}>
          <option value="60">60%</option><option value="50">50%</option><option value="40">40%</option>
        </select>
      </Field>
      <Field label="납부 회차">
        <select style={selectStyle} value={count} onChange={e => { setCount(e.target.value); setResult(null); }}>
          <option value="2">2회차</option><option value="3">3회차</option><option value="4">4회차</option><option value="5">5회차</option><option value="6">6회차</option>
        </select>
      </Field>
      <Field label="이자율 (연, %)"><input style={inputStyle} type="number" placeholder="예: 5.5" value={rate} onChange={e => setRate(e.target.value)} /></Field>
      <Field label="입주 예정일"><input style={inputStyle} type="date" value={moveInDate} onChange={e => setMoveInDate(e.target.value)} /></Field>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 13, color: "#666", marginBottom: 8, fontWeight: 600 }}>회차별 납부일</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {Array.from({ length: cnt }).map((_, i) => (
            <div key={i}>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>{i + 1}회차</div>
              <input style={{ ...inputStyle, fontSize: 13, padding: "8px 10px" }} type="date" value={payDates[i] || ""} onChange={e => updatePayDate(i, e.target.value)} />
            </div>
          ))}
        </div>
      </div>
      <CalcBtn onClick={calc} />
      {result && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>입주일: {moveInDate}</div>
          <ResultRow label="총 중도금" value={won(result.intermediate)} />
          <ResultRow label="회차당 중도금" value={won(result.perPayment)} />
          <ResultRow label="총 예상 이자" value={won(result.totalInterest)} highlight />
          <div style={{ marginTop: 12 }}>
            {result.payments.map((p: any) => (
              <div key={p.round} style={{ borderRadius: 8, marginBottom: 6, background: "#f9fafc", padding: "10px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1e3a5f" }}>{p.round}회차</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#2563eb" }}>{p.interest !== null ? won(p.interest) : <span style={{ color: "#bbb" }}>날짜 미입력</span>}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 12, color: "#888" }}>
                  <span>납부일: {p.date || "미입력"}</span>
                  <span>{p.diffDays !== null ? `잔여 ${p.diffDays}일` : ""}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// 3. 취득세
function calcAcqRate(p: number, houseCount: string, isAdjusted: boolean, houseType: string) {
  if (houseType === "commercial") return { acqRate: 0.04, eduRate: 0.004, note: "상가·오피스텔·토지 (4%)" };
  let baseRate: number, baseEduRate: number;
  if (p <= 600000000) { baseRate = 0.01; baseEduRate = 0.001; }
  else if (p <= 900000000) { baseRate = (p / 100000000 * 2 / 3 - 3) * (1 / 100); baseEduRate = baseRate * 0.1; }
  else { baseRate = 0.03; baseEduRate = 0.003; }
  const n = parseInt(houseCount);
  let acqRate = baseRate, note = "";
  if (n === 1) { acqRate = baseRate; note = p <= 600000000 ? "1주택 6억 이하 (1%)" : p <= 900000000 ? `1주택 6~9억 (${(baseRate * 100).toFixed(2)}%)` : "1주택 9억 초과 (3%)"; }
  else if (n === 2) { acqRate = isAdjusted ? 0.08 : baseRate; note = isAdjusted ? "2주택 · 조정 (8%)" : `2주택 · 비조정 (${(baseRate * 100).toFixed(2)}%)`; }
  else if (n === 3) { acqRate = isAdjusted ? 0.12 : 0.08; note = isAdjusted ? "3주택 · 조정 (12%)" : "3주택 · 비조정 (8%)"; }
  else { acqRate = 0.12; note = `${n}주택 (12%)`; }
  const eduRate = acqRate >= 0.08 ? 0.004 : acqRate * 0.1;
  return { acqRate, eduRate, note };
}

function AcquisitionCalc() {
  const [price, setPrice] = useState("");
  const [houseCount, setHouseCount] = useState("1");
  const [houseType, setHouseType] = useState("general");
  const [isAdjusted, setIsAdjusted] = useState(false);
  const [isOver85, setIsOver85] = useState(false);
  const [result, setResult] = useState<any>(null);

  const calc = () => {
    const p = parseWon(price); if (!p) return;
    const { acqRate, eduRate, note } = calcAcqRate(p, houseCount, isAdjusted, houseType);
    const acquisitionTax = p * acqRate, localEduTax = p * eduRate;
    const specRate = isOver85 ? acqRate * 0.1 : 0;
    const specialTax = p * specRate;
    setResult({ acquisitionTax, localEduTax, specialTax, total: acquisitionTax + localEduTax + specialTax, acqRate, eduRate, specRate, note });
  };

  return (
    <Card title="취득세 계산">
      <div style={{ background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 8, padding: "10px 14px", marginBottom: 18, fontSize: 12, color: "#7a6000", lineHeight: 1.6 }}>
        📌 2026년 현재 조정대상지역<br />
        · 서울특별시 25개 구 전 지역 (강남·서초·송파·용산 포함 전 구)<br />
        · 경기도: 과천, 광명, 성남(분당·수정·중원), 수원(영통·장안·팔달), 안양(동안), 용인(수지), 의왕, 하남<br />
        💡 생애최초 주택 구입 시 취득세 최대 200만 원 감면 (12억 이하, 2028.12.31.까지 연장 확정 · 거주 목적 요건 필수)
      </div>
      <Field label="취득 금액"><WonInput placeholder="예: 500,000,000" value={price} onChange={setPrice} /></Field>
      <Field label="부동산 유형">
        <select style={selectStyle} value={houseType} onChange={e => { setHouseType(e.target.value); setResult(null); }}>
          <option value="general">주택</option><option value="commercial">상가 / 오피스텔 / 토지</option>
        </select>
      </Field>
      {houseType === "general" && (
        <>
          <Field label="취득 후 보유 주택 수">
            <select style={selectStyle} value={houseCount} onChange={e => setHouseCount(e.target.value)}>
              <option value="1">1주택</option><option value="2">2주택</option><option value="3">3주택</option><option value="4">4주택 이상</option>
            </select>
          </Field>
          {parseInt(houseCount) >= 2 && (
            <Field label="취득 주택 소재지">
              <select style={selectStyle} value={isAdjusted ? "adj" : "nonadj"} onChange={e => setIsAdjusted(e.target.value === "adj")}>
                <option value="nonadj">비조정대상지역</option><option value="adj">조정대상지역</option>
              </select>
            </Field>
          )}
          <Field label="전용면적">
            <select style={selectStyle} value={isOver85 ? "over" : "under"} onChange={e => setIsOver85(e.target.value === "over")}>
              <option value="under">85㎡ 이하</option><option value="over">85㎡ 초과</option>
            </select>
          </Field>
        </>
      )}
      <CalcBtn onClick={calc} />
      {result && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, color: "#2563eb", fontWeight: 600, marginBottom: 10 }}>📋 {result.note}</div>
          <ResultRow label={`취득세 (${(result.acqRate * 100).toFixed(2)}%)`} value={won(result.acquisitionTax)} highlight />
          <ResultRow label={`지방교육세 (${(result.eduRate * 100).toFixed(2)}%)`} value={won(result.localEduTax)} />
          {result.specialTax > 0 && <ResultRow label={`농어촌특별세 (${(result.specRate * 100).toFixed(2)}%)`} value={won(result.specialTax)} />}
          <ResultRow label="합계" value={won(result.total)} />
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 8, lineHeight: 1.6 }}>
            ※ 생애최초 구입 시 취득세 200만원 감면 가능 (2025.12.31까지)<br />
            ※ 일시적 2주택(3년 내 종전주택 처분)은 1주택 세율 적용
          </div>
        </div>
      )}
    </Card>
  );
}

// 4. 중개수수료
const SALE_BRACKETS = [
  { limit: 50000000, rate: 0.006, max: 250000 },
  { limit: 200000000, rate: 0.005, max: 800000 },
  { limit: 900000000, rate: 0.004, max: null },
  { limit: 1200000000, rate: 0.005, max: null },
  { limit: 1500000000, rate: 0.006, max: null },
  { limit: Infinity, rate: 0.007, max: null },
];
const RENT_BRACKETS = [
  { limit: 50000000, rate: 0.005, max: 200000 },
  { limit: 100000000, rate: 0.004, max: 300000 },
  { limit: 600000000, rate: 0.003, max: null },
  { limit: 1200000000, rate: 0.004, max: null },
  { limit: 1500000000, rate: 0.005, max: null },
  { limit: Infinity, rate: 0.006, max: null },
];

function getBrokerageFee(amt: number, brackets: typeof SALE_BRACKETS) {
  for (const b of brackets) {
    if (amt <= b.limit) {
      const fee = amt * b.rate;
      return { fee: b.max ? Math.min(fee, b.max) : fee, rate: b.rate * 100 };
    }
  }
  return { fee: 0, rate: 0 };
}

function BrokerageCalc() {
  const [tradeType, setTradeType] = useState("sale");
  const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [monthly, setMonthly] = useState("");
  const [result, setResult] = useState<any>(null);

  const calc = () => {
    if (tradeType === "sale") {
      const p = parseWon(price); if (!p) return;
      const { fee, rate } = getBrokerageFee(p, SALE_BRACKETS);
      setResult({ fee, rate, vat: fee * 0.1, total: fee * 1.1, note: "매매가 기준" });
    } else if (tradeType === "jeonse") {
      const d = parseWon(deposit); if (!d) return;
      const { fee, rate } = getBrokerageFee(d, RENT_BRACKETS);
      setResult({ fee, rate, vat: fee * 0.1, total: fee * 1.1, note: "전세금 기준" });
    } else {
      const d = parseWon(deposit), m = parseWon(monthly);
      if (!m && !d) return;
      const calc1 = d + m * 100, calc2 = d + m * 70;
      const useAmt = calc2 < 50000000 ? calc2 : calc1;
      const { fee, rate } = getBrokerageFee(useAmt, RENT_BRACKETS);
      setResult({ fee, rate, vat: fee * 0.1, total: fee * 1.1, note: calc2 < 50000000 ? `보증금+월세×70 = ${won(useAmt)}` : `보증금+월세×100 = ${won(useAmt)}` });
    }
  };

  return (
    <Card title="부동산 중개수수료 계산">
      <div style={{ background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 8, padding: "10px 14px", marginBottom: 18, fontSize: 12, color: "#7a6000" }}>
        📌 2021년 10월 개정 법정 상한 요율 기준
      </div>
      <Field label="거래 유형">
        <select style={selectStyle} value={tradeType} onChange={e => { setTradeType(e.target.value); setResult(null); }}>
          <option value="sale">매매</option><option value="jeonse">전세</option><option value="monthly">월세</option>
        </select>
      </Field>
      {tradeType === "sale" && <Field label="매매가"><WonInput placeholder="예: 500,000,000" value={price} onChange={setPrice} /></Field>}
      {tradeType === "jeonse" && <Field label="전세금"><WonInput placeholder="예: 300,000,000" value={deposit} onChange={setDeposit} /></Field>}
      {tradeType === "monthly" && (<>
        <Field label="보증금"><WonInput placeholder="예: 30,000,000" value={deposit} onChange={setDeposit} /></Field>
        <Field label="월 임대료"><WonInput placeholder="예: 800,000" value={monthly} onChange={setMonthly} /></Field>
      </>)}
      <CalcBtn onClick={calc} />
      {result && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>산정: {result.note} / 요율: {result.rate}%</div>
          <ResultRow label="중개수수료 (상한)" value={won(result.fee)} highlight />
          <ResultRow label="VAT (10%)" value={won(result.vat)} />
          <ResultRow label="합계 (VAT 포함)" value={won(result.total)} />
        </div>
      )}
    </Card>
  );
}

// 5. 수익률
function ROICalc() {
  const [buyPrice, setBuyPrice] = useState("");
  const [equity, setEquity] = useState("");
  const [loan, setLoan] = useState("");
  const [loanRate, setLoanRate] = useState("");
  const [tenantDeposit, setTenantDeposit] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [result, setResult] = useState<any>(null);

  const calc = () => {
    const buy = parseWon(buyPrice), eq = parseWon(equity), ln = parseWon(loan);
    const rate = parseFloat(loanRate) || 0, dep = parseWon(tenantDeposit), rent = parseWon(monthlyRent) * 12;
    if (!buy) return;
    const annualLoanInterest = ln * (rate / 100);
    const totalInvested = eq || (buy - ln - dep);
    const netIncome = rent - annualLoanInterest;
    setResult({ buy, eq: totalInvested, ln, annualLoanInterest, dep, rent, netIncome, grossYield: rent / buy * 100, netYield: totalInvested > 0 ? netIncome / totalInvested * 100 : 0 });
  };

  return (
    <Card title="수익률 / ROI 계산">
      <Field label="매입 가격"><WonInput placeholder="예: 500,000,000" value={buyPrice} onChange={setBuyPrice} /></Field>
      <div style={{ background: "#f0f4fb", borderRadius: 10, padding: "14px 14px 6px", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", marginBottom: 10 }}>💰 자금 구성</div>
        <Field label="자기자본"><WonInput placeholder="예: 200,000,000" value={equity} onChange={setEquity} /></Field>
        <Field label="대출금"><WonInput placeholder="예: 200,000,000" value={loan} onChange={setLoan} /></Field>
        <Field label="대출 금리 (연, %)"><input style={inputStyle} type="number" placeholder="예: 4.5" value={loanRate} onChange={e => setLoanRate(e.target.value)} /></Field>
        <Field label="임차인 보증금"><WonInput placeholder="예: 50,000,000" value={tenantDeposit} onChange={setTenantDeposit} /></Field>
      </div>
      <div style={{ background: "#f0f4fb", borderRadius: 10, padding: "14px 14px 6px", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", marginBottom: 10 }}>📋 수입</div>
        <Field label="월 임대료"><WonInput placeholder="예: 1,000,000" value={monthlyRent} onChange={setMonthlyRent} /></Field>
      </div>
      <CalcBtn onClick={calc} />
      {result && (
        <div style={{ marginTop: 20 }}>
          <ResultRow label="자기자본" value={won(result.eq)} />
          <ResultRow label="대출금" value={won(result.ln)} />
          <ResultRow label="연 임대수입" value={won(result.rent)} />
          <ResultRow label="연 대출이자" value={won(result.annualLoanInterest)} />
          <ResultRow label="연 순수익" value={won(result.netIncome)} />
          <div style={{ height: 8 }} />
          <ResultRow label="총수익률 (Gross)" value={`${result.grossYield.toFixed(2)}%`} />
          <ResultRow label="순수익률 (Net ROI)" value={`${result.netYield.toFixed(2)}%`} highlight />
        </div>
      )}
    </Card>
  );
}

const COMPS: Record<string, React.ComponentType> = {
  loan: LoanCalc, intermediate: IntermediateCalc, acquisition: AcquisitionCalc, brokerage: BrokerageCalc, roi: ROICalc,
};

export default function Calculator() {
  const [active, setActive] = useState("loan");
  const Comp = COMPS[active];
  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f9", fontFamily: "'Apple SD Gothic Neo', sans-serif" }}>
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "24px 16px 48px" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1e3a5f" }}>🏠 부동산 계산기</h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#888" }}>대출 · 중도금 · 취득세 · 중개수수료 · 수익률</p>
        </div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActive(t.id)} style={{
              padding: "8px 14px", borderRadius: 20, border: "none", cursor: "pointer", whiteSpace: "nowrap",
              fontWeight: 600, fontSize: 13,
              background: active === t.id ? "#2563eb" : "#fff",
              color: active === t.id ? "#fff" : "#555",
              boxShadow: active === t.id ? "0 2px 8px rgba(37,99,235,0.3)" : "0 1px 4px rgba(0,0,0,0.08)",
            }}>{t.label}</button>
          ))}
        </div>
        <Comp />
      </div>
    </div>
  );
}