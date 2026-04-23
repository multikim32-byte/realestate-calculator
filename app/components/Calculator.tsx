"use client";

import { useState, useMemo, useEffect } from "react";

const tabs = [
  { id: "loan", label: "대출 상환" },
  { id: "intermediate", label: "중도금 이자" },
  { id: "acquisition", label: "취득세" },
  { id: "brokerage", label: "중개수수료" },
  { id: "roi", label: "수익률" },
  { id: "subscription", label: "청약 가점" },
  { id: "conversion", label: "전월세전환율" },
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

function ShareResultBtn({ params }: { params: Record<string, string> }) {
  const [copied, setCopied] = useState(false);
  function share() {
    const url = new URL(window.location.href);
    url.pathname = '/calculator';
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const text = url.toString();
    if (navigator.share) {
      navigator.share({ title: '부동산 계산기 결과', url: text });
    } else {
      navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    }
  }
  return (
    <button onClick={share} style={{
      marginTop: 12, width: "100%", padding: "10px", borderRadius: 10,
      border: "1.5px solid #2563eb", background: "#eff6ff",
      color: "#2563eb", fontWeight: 700, fontSize: 14, cursor: "pointer",
    }}>
      {copied ? "✅ 링크 복사됨!" : "🔗 계산 결과 공유"}
    </button>
  );
}

// 월별 상환 테이블
type ScheduleRow = { month: number; payment: number; principal: number; interest: number; balance: number };
type YearRow = { month: number; label: string; payment: number; principal: number; interest: number; balance: number };
type IntermPaymentRow = { round: number; amount: number; date: string; days: number | null; interest: number | null; loan: boolean };

function AmortizationTable({ schedule }: { schedule: ScheduleRow[] }) {
  const [page, setPage] = useState(1);
  const [yearOnly, setYearOnly] = useState(false);
  const PER = 12;

  const display = useMemo(() => {
    if (!yearOnly) return schedule;
    const years: Record<number, YearRow> = {};
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
            {(slice as (ScheduleRow | YearRow)[]).map((r, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfd" }}>
                <td style={td}>{yearOnly ? (r as YearRow).label : `${r.month}회`}</td>
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

  function computeLoan(a: string, r: string, y: string, t: string) {
    const P = parseWon(a), mr = parseFloat(r) / 100 / 12, n = parseFloat(y) * 12;
    if (!P || !mr || !n) return;
    let schedule: ScheduleRow[] = [];
    if (t === "equal") {
      const monthly = P * mr * Math.pow(1 + mr, n) / (Math.pow(1 + mr, n) - 1);
      let balance = P;
      for (let i = 1; i <= n; i++) {
        const interest = balance * mr, principal = monthly - interest;
        balance = Math.max(0, balance - principal);
        schedule.push({ month: i, payment: monthly, principal, interest, balance });
      }
      setResult({ monthly, total: monthly * n, interest: monthly * n - P, type: "equal", schedule });
    } else {
      const principal = P / n; let balance = P, totalInterest = 0;
      for (let i = 1; i <= n; i++) {
        const interest = balance * mr, payment = principal + interest;
        balance = Math.max(0, balance - principal); totalInterest += interest;
        schedule.push({ month: i, payment, principal, interest, balance });
      }
      setResult({ principal, firstMonth: schedule[0].payment, lastMonth: schedule[n - 1].payment, totalInterest, total: P + totalInterest, type: "reducing", schedule });
    }
  }

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('tab') !== 'loan') return;
    const a = sp.get('amt') || '', r = sp.get('rate') || '', y = sp.get('years') || '', t = sp.get('type') || 'equal';
    if (!a && !r && !y) return;
    setAmt(a); setRate(r); setYears(y); setType(t);
    computeLoan(a, r, y, t);
  }, []);

  const calc = () => computeLoan(amt, rate, years, type);

  return (
    <>
      <Card title="대출 원리금 상환 계산">
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 0, marginBottom: 18, lineHeight: 1.6 }}>
          이 계산기는 주택담보대출·신용대출 등의 <strong>월 납입금과 총 이자 부담</strong>을 계산하는 데 사용합니다. 원리금균등상환과 원금균등상환 방식을 모두 지원하며, 회차별 상환 내역을 확인할 수 있습니다.
        </p>
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
            <ShareResultBtn params={{ tab: "loan", amt, rate, years, type }} />
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
  const [perAmount, setPerAmount] = useState("");
  const [rate, setRate] = useState("");
  const [balanceDate, setBalanceDate] = useState("");
  const [count, setCount] = useState("6");
  const [payDates, setPayDates] = useState(Array(6).fill(""));
  const [loanFlags, setLoanFlags] = useState(Array(6).fill(true));
  const [result, setResult] = useState<any>(null);
  const cnt = parseInt(count);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('tab') !== 'intermediate') return;
    const sp_ = sp.get('salePrice') || '', pa = sp.get('perAmount') || '', r = sp.get('rate') || '';
    const bd = sp.get('balanceDate') || '', ct = sp.get('count') || '6';
    const dates = sp.get('payDates') || '';
    const flags = sp.get('loanFlags') || '';
    if (!sp_ && !pa) return;
    const parsedDates = dates ? dates.split(',') : Array(parseInt(ct)).fill('');
    const parsedFlags = flags ? flags.split(',').map(f => f === '1') : Array(parseInt(ct)).fill(true);
    setSalePrice(sp_); setPerAmount(pa); setRate(r); setBalanceDate(bd); setCount(ct);
    setPayDates(parsedDates); setLoanFlags(parsedFlags);
    // 자동 계산
    const per = parseWon(pa), rv = parseFloat(r) / 100;
    if (!bd || !per || !rv) return;
    const balDay = new Date(bd);
    let totalInterest = 0;
    const payments = [];
    for (let i = 0; i < parseInt(ct); i++) {
      const loan = parsedFlags[i];
      const pd = parsedDates[i] ? new Date(parsedDates[i]) : null;
      const days = pd ? Math.max(0, Math.round((balDay.getTime() - pd.getTime()) / 86400000)) : null;
      const interest = (loan && days !== null) ? Math.round(per * rv * days / 365) : null;
      if (interest !== null) totalInterest += interest;
      payments.push({ round: i + 1, amount: per, date: parsedDates[i], days, interest, loan });
    }
    setResult({ perAmount: per, totalAmount: per * parseInt(ct), totalInterest, payments });
  }, []);

  // 총 분양가 변경 시 회차별 중도금 자동 계산 (60% / 회차수)
  const handleSalePrice = (v: string) => {
    setSalePrice(v);
    const total = parseWon(v);
    if (total) setPerAmount(fmt(Math.round(total * 0.6 / cnt)));
  };

  const handleCount = (v: string) => {
    setCount(v);
    const total = parseWon(salePrice);
    if (total) setPerAmount(fmt(Math.round(total * 0.6 / parseInt(v))));
    setResult(null);
  };

  const updatePayDate = (i: number, v: string) => {
    const arr = [...payDates]; arr[i] = v; setPayDates(arr);
  };

  const toggleLoan = (i: number) => {
    const arr = [...loanFlags]; arr[i] = !arr[i]; setLoanFlags(arr);
  };

  const calc = () => {
    const per = parseWon(perAmount), r = parseFloat(rate) / 100;
    if (!balanceDate || !per || !r) return;
    const balDay = new Date(balanceDate);
    let totalInterest = 0;
    const payments = [];
    for (let i = 0; i < cnt; i++) {
      const loan = loanFlags[i];
      const pd = payDates[i] ? new Date(payDates[i]) : null;
      const days = pd ? Math.max(0, Math.round((balDay.getTime() - pd.getTime()) / 86400000)) : null;
      // 이자 = 회차별 중도금 × 연이율 × 적용일수 / 365
      const interest = (loan && days !== null) ? Math.round(per * r * days / 365) : null;
      if (interest !== null) totalInterest += interest;
      payments.push({ round: i + 1, amount: per, date: payDates[i], days, interest, loan });
    }
    setResult({ perAmount: per, totalAmount: per * cnt, totalInterest, payments });
  };

  const tableHeaderStyle: React.CSSProperties = {
    padding: "9px 8px", textAlign: "center", fontWeight: 700, fontSize: 12,
    color: "#555", background: "#f0f4f9", whiteSpace: "nowrap", borderBottom: "1px solid #e0e7ef",
  };
  const tableCellStyle: React.CSSProperties = {
    padding: "8px", textAlign: "center", fontSize: 13, borderBottom: "1px solid #f0f4f9", whiteSpace: "nowrap",
  };

  return (
    <Card title="중도금 대출 이자 계산기">
      <p style={{ fontSize: 13, color: '#6b7280', marginTop: 0, marginBottom: 18, lineHeight: 1.6 }}>
        이 계산기는 분양 아파트 계약 후 납부하는 <strong>중도금 대출 이자 총액</strong>을 계산하는 데 사용합니다. 회차별 납부일과 잔금일을 입력하면 각 회차의 이자와 합계를 자동으로 계산합니다.
      </p>
      <Field label="총 분양가"><WonInput placeholder="예: 518,000,000" value={salePrice} onChange={handleSalePrice} /></Field>
      <Field label="회차별 중도금 (분양가×60%÷회차)"><WonInput placeholder="예: 51,800,000" value={perAmount} onChange={setPerAmount} /></Field>
      <Field label="납부 회차">
        <select style={selectStyle} value={count} onChange={e => handleCount(e.target.value)}>
          {["2","3","4","5","6"].map(v => <option key={v} value={v}>{v}회차</option>)}
        </select>
      </Field>
      <Field label="중도금 대출 이율 (연, %)">
        <input style={inputStyle} type="number" step="0.1" placeholder="예: 4.2" value={rate} onChange={e => setRate(e.target.value)} />
      </Field>
      <Field label="잔금일">
        <input style={inputStyle} type="date" value={balanceDate} onChange={e => setBalanceDate(e.target.value)} />
      </Field>
      <CalcBtn onClick={calc} />
      {result && (
        <div style={{ marginTop: 20 }}>
          <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #e0e7ef" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>회차</th>
                  <th style={tableHeaderStyle}>회차별 중도금</th>
                  <th style={tableHeaderStyle}>납부일</th>
                  <th style={tableHeaderStyle}>적용 일수</th>
                  <th style={tableHeaderStyle}>총 이자</th>
                  <th style={tableHeaderStyle}>대출 여부</th>
                </tr>
              </thead>
              <tbody>
                {(result.payments as IntermPaymentRow[]).map((p, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfd" }}>
                    <td style={{ ...tableCellStyle, fontWeight: 700, color: "#1e3a5f" }}>{p.round}</td>
                    <td style={tableCellStyle}>{fmt(p.amount)}원</td>
                    <td style={{ ...tableCellStyle }}>
                      <input
                        type="date"
                        value={payDates[i] || ""}
                        onChange={e => updatePayDate(i, e.target.value)}
                        style={{ fontSize: 12, border: "1px solid #e0e7ef", borderRadius: 6, padding: "4px 6px" }}
                      />
                    </td>
                    <td style={{ ...tableCellStyle, color: p.days !== null ? "#374151" : "#bbb" }}>
                      {p.days !== null ? p.days : "-"}
                    </td>
                    <td style={{ ...tableCellStyle, fontWeight: 700, color: p.interest !== null ? "#2563eb" : "#bbb" }}>
                      {p.interest !== null ? `${fmt(p.interest)}원` : "-"}
                    </td>
                    <td style={tableCellStyle}>
                      <button
                        onClick={() => toggleLoan(i)}
                        style={{
                          width: 28, height: 28, borderRadius: "50%", border: "none", cursor: "pointer",
                          background: loanFlags[i] ? "#dcfce7" : "#fee2e2",
                          color: loanFlags[i] ? "#16a34a" : "#dc2626",
                          fontWeight: 700, fontSize: 14,
                        }}
                      >{loanFlags[i] ? "O" : "X"}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 16, padding: "12px 16px", background: "#f4f7fb", borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#555", marginBottom: 6 }}>
              <span>회차별 중도금 합계</span>
              <span style={{ fontWeight: 700, color: "#1e3a5f" }}>{won(result.totalAmount)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700 }}>
              <span style={{ color: "#555" }}>총 이자 합계</span>
              <span style={{ color: "#2563eb" }}>{won(result.totalInterest)}</span>
            </div>
          </div>
          <ShareResultBtn params={{
            tab: "intermediate",
            salePrice,
            perAmount,
            rate,
            balanceDate,
            count,
            payDates: payDates.join(','),
            loanFlags: loanFlags.map(f => f ? '1' : '0').join(','),
          }} />
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

  function computeAcq(pr: string, hc: string, ht: string, adj: boolean, o85: boolean) {
    const p = parseWon(pr); if (!p) return;
    const { acqRate, eduRate, note } = calcAcqRate(p, hc, adj, ht);
    const acquisitionTax = p * acqRate, localEduTax = p * eduRate;
    const specRate = o85 ? acqRate * 0.1 : 0;
    const specialTax = p * specRate;
    setResult({ acquisitionTax, localEduTax, specialTax, total: acquisitionTax + localEduTax + specialTax, acqRate, eduRate, specRate, note });
  }

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('tab') !== 'acquisition') return;
    const pr = sp.get('price') || '', hc = sp.get('houseCount') || '1', ht = sp.get('houseType') || 'general';
    const adj = sp.get('isAdjusted') === 'true', o85 = sp.get('isOver85') === 'true';
    if (!pr) return;
    setPrice(pr); setHouseCount(hc); setHouseType(ht); setIsAdjusted(adj); setIsOver85(o85);
    computeAcq(pr, hc, ht, adj, o85);
  }, []);

  const calc = () => computeAcq(price, houseCount, houseType, isAdjusted, isOver85);

  return (
    <Card title="취득세 계산">
      <p style={{ fontSize: 13, color: '#6b7280', marginTop: 0, marginBottom: 18, lineHeight: 1.6 }}>
        이 계산기는 주택·상가·오피스텔 등 부동산 취득 시 납부해야 하는 <strong>취득세·지방교육세·농어촌특별세</strong>를 계산하는 데 사용합니다. 주택 수와 조정대상지역 여부에 따른 중과세율도 반영됩니다.
      </p>
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
            ※ 생애최초 구입 시 취득세 200만원 감면 가능 (2026.12.31까지)<br />
            ※ 일시적 2주택(3년 내 종전주택 처분)은 1주택 세율 적용
          </div>
          <ShareResultBtn params={{ tab: "acquisition", price, houseCount, houseType, isAdjusted: String(isAdjusted), isOver85: String(isOver85) }} />
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

  function computeBrokerage(tt: string, pr: string, dep: string, mo: string) {
    if (tt === "sale") {
      const p = parseWon(pr); if (!p) return;
      const { fee, rate } = getBrokerageFee(p, SALE_BRACKETS);
      setResult({ fee, rate, vat: fee * 0.1, total: fee * 1.1, note: "매매가 기준", tt, pr, dep, mo });
    } else if (tt === "jeonse") {
      const d = parseWon(dep); if (!d) return;
      const { fee, rate } = getBrokerageFee(d, RENT_BRACKETS);
      setResult({ fee, rate, vat: fee * 0.1, total: fee * 1.1, note: "전세금 기준", tt, pr, dep, mo });
    } else {
      const d = parseWon(dep), m = parseWon(mo);
      if (!m && !d) return;
      const calc1 = d + m * 100, calc2 = d + m * 70;
      const useAmt = calc2 < 50000000 ? calc2 : calc1;
      const { fee, rate } = getBrokerageFee(useAmt, RENT_BRACKETS);
      setResult({ fee, rate, vat: fee * 0.1, total: fee * 1.1, note: calc2 < 50000000 ? `보증금+월세×70 = ${won(useAmt)}` : `보증금+월세×100 = ${won(useAmt)}`, tt, pr, dep, mo });
    }
  }

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('tab') !== 'brokerage') return;
    const tt = sp.get('tradeType') || 'sale', pr = sp.get('price') || '', dep = sp.get('deposit') || '', mo = sp.get('monthly') || '';
    if (!pr && !dep && !mo) return;
    setTradeType(tt); setPrice(pr); setDeposit(dep); setMonthly(mo);
    computeBrokerage(tt, pr, dep, mo);
  }, []);

  const calc = () => computeBrokerage(tradeType, price, deposit, monthly);

  return (
    <Card title="부동산 중개수수료 계산">
      <p style={{ fontSize: 13, color: '#6b7280', marginTop: 0, marginBottom: 18, lineHeight: 1.6 }}>
        이 계산기는 매매·전세·월세 거래 시 발생하는 <strong>부동산 중개수수료(법정 상한액)</strong>를 계산하는 데 사용합니다. VAT 10%를 포함한 최종 납부액까지 확인할 수 있습니다.
      </p>
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
          <ShareResultBtn params={{ tab: "brokerage", tradeType: result.tt, price: result.pr, deposit: result.dep, monthly: result.mo }} />
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

  function computeROI(bp: string, eq: string, ln: string, lr: string, td: string, mr: string) {
    const buy = parseWon(bp), eqV = parseWon(eq), lnV = parseWon(ln);
    const rate = parseFloat(lr) || 0, dep = parseWon(td), rent = parseWon(mr) * 12;
    if (!buy) return;
    const annualLoanInterest = lnV * (rate / 100);
    const totalInvested = eqV || (buy - lnV - dep);
    const netIncome = rent - annualLoanInterest;
    setResult({ buy, eq: totalInvested, ln: lnV, annualLoanInterest, dep, rent, netIncome, grossYield: rent / buy * 100, netYield: totalInvested > 0 ? netIncome / totalInvested * 100 : 0, bp, eqStr: eq, lnStr: ln, lr, td, mr });
  }

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('tab') !== 'roi') return;
    const bp = sp.get('buyPrice') || '', eq = sp.get('equity') || '', ln = sp.get('loan') || '';
    const lr = sp.get('loanRate') || '', td = sp.get('tenantDeposit') || '', mr = sp.get('monthlyRent') || '';
    if (!bp) return;
    setBuyPrice(bp); setEquity(eq); setLoan(ln); setLoanRate(lr); setTenantDeposit(td); setMonthlyRent(mr);
    computeROI(bp, eq, ln, lr, td, mr);
  }, []);

  const calc = () => computeROI(buyPrice, equity, loan, loanRate, tenantDeposit, monthlyRent);

  return (
    <Card title="수익률 / ROI 계산">
      <p style={{ fontSize: 13, color: '#6b7280', marginTop: 0, marginBottom: 18, lineHeight: 1.6 }}>
        이 계산기는 임대용 부동산의 <strong>총수익률(Gross Yield)과 순수익률(Net ROI)</strong>을 계산하는 데 사용합니다. 대출 이자와 임차인 보증금을 반영한 실질 투자 수익률을 확인하세요.
      </p>
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
          <ShareResultBtn params={{ tab: "roi", buyPrice: result.bp, equity: result.eqStr, loan: result.lnStr, loanRate: result.lr, tenantDeposit: result.td, monthlyRent: result.mr }} />
        </div>
      )}
    </Card>
  );
}

// 청약 가점 계산기
const HOMELESS_SCORE = [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32];
const ACCOUNT_SCORE  = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17];

function getHomelessScore(years: number) {
  if (years < 1) return 2;
  return HOMELESS_SCORE[Math.min(Math.floor(years), 15)];
}
function getAccountScore(years: number) {
  if (years < 0.5) return 1;
  if (years < 1) return 2;
  return ACCOUNT_SCORE[Math.min(Math.floor(years), 15) + 1];
}
function getDependentScore(n: number) {
  return Math.min(n + 1, 6) * 5 + (n === 0 ? 0 : 0);
  // 0명:5 1명:10 2명:15 3명:20 4명:25 5명:30 6명이상:35
}

function SubscriptionCalc() {
  const [homelessYears, setHomelessYears] = useState('');
  const [dependents, setDependents] = useState('0');
  const [accountYears, setAccountYears] = useState('');
  const [result, setResult] = useState<{homeless:number;dep:number;account:number;total:number;hy:string;dep0:string;ay:string}|null>(null);

  function computeSub(hy: string, dep0: string, ay: string) {
    const hyN = parseFloat(hy) || 0, depN = parseInt(dep0) || 0, ayN = parseFloat(ay) || 0;
    const homeless = getHomelessScore(hyN);
    const depFinal = depN === 0 ? 5 : Math.min(depN, 6) * 5 + 5;
    const account = getAccountScore(ayN);
    setResult({ homeless, dep: depFinal, account, total: homeless + depFinal + account, hy, dep0, ay });
  }

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('tab') !== 'subscription') return;
    const hy = sp.get('homelessYears') || '', dep0 = sp.get('dependents') || '0', ay = sp.get('accountYears') || '';
    if (!hy && !ay) return;
    setHomelessYears(hy); setDependents(dep0); setAccountYears(ay);
    computeSub(hy, dep0, ay);
  }, []);

  function calc() {
    computeSub(homelessYears, dependents, accountYears);
  }

  const scoreColor = (total: number) =>
    total >= 70 ? '#059669' : total >= 55 ? '#d97706' : '#dc2626';

  return (
    <Card title="청약 가점 계산기">
      <p style={{ fontSize: 13, color: '#6b7280', marginTop: 0, marginBottom: 18, lineHeight: 1.6 }}>
        이 계산기는 아파트 청약 시 <strong>가점제 총점(최대 84점)</strong>을 계산하는 데 사용합니다. 무주택기간·부양가족수·청약통장 가입기간을 입력하면 나의 가점과 당첨 가능성을 바로 확인할 수 있습니다.
      </p>
      <div style={{ background: '#eff6ff', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: '#1d4ed8', lineHeight: 1.6 }}>
        <strong>가점제 배점 기준</strong><br/>
        무주택기간 (최대 32점) + 부양가족수 (최대 35점) + 청약통장 가입기간 (최대 17점) = 총 84점
      </div>

      <Field label="무주택 기간 (년)">
        <input
          style={inputStyle} type="number" min="0" max="15" step="0.5"
          placeholder="예: 5 (5년), 2.5 (2년 6개월)"
          value={homelessYears}
          onChange={e => setHomelessYears(e.target.value)}
        />
        <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>※ 만 30세 미만 미혼은 부모와 세대 분리 시 인정</div>
      </Field>

      <Field label="부양가족 수 (본인 제외)">
        <select style={selectStyle} value={dependents} onChange={e => setDependents(e.target.value)}>
          {[0,1,2,3,4,5,6].map(n => (
            <option key={n} value={n}>{n}명{n === 6 ? ' 이상' : ''} → {(n===0?5:Math.min(n,6)*5+5)}점</option>
          ))}
        </select>
        <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>※ 배우자·직계존속(부모·조부모)·직계비속(자녀·손자녀) 포함</div>
      </Field>

      <Field label="청약통장 가입기간 (년)">
        <input
          style={inputStyle} type="number" min="0" max="15" step="0.5"
          placeholder="예: 10 (10년), 7.5 (7년 6개월)"
          value={accountYears}
          onChange={e => setAccountYears(e.target.value)}
        />
        <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>※ 청약저축·주택청약종합저축 가입일 기준</div>
      </Field>

      <CalcBtn onClick={calc} />

      {result && (
        <div style={{ marginTop: 20 }}>
          {/* 총점 강조 */}
          <div style={{
            textAlign: 'center', padding: '24px 16px', borderRadius: 14,
            background: `linear-gradient(135deg, ${scoreColor(result.total)}15, ${scoreColor(result.total)}25)`,
            border: `2px solid ${scoreColor(result.total)}40`, marginBottom: 16,
          }}>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>나의 청약 가점</div>
            <div style={{ fontSize: 52, fontWeight: 900, color: scoreColor(result.total), lineHeight: 1 }}>
              {result.total}
            </div>
            <div style={{ fontSize: 14, color: '#888', marginTop: 4 }}>/ 84점</div>
            <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: scoreColor(result.total) }}>
              {result.total >= 70 ? '🏆 높은 가점 — 당첨 가능성 높음' :
               result.total >= 55 ? '📊 중간 가점 — 지역·단지별 경쟁률 확인 필요' :
               '📌 낮은 가점 — 추첨제 물량 노리기 추천'}
            </div>
          </div>

          <ResultRow label="무주택기간" value={`${result.homeless}점`} sub="최대 32점 (15년 이상)" />
          <ResultRow label="부양가족수" value={`${result.dep}점`} sub="최대 35점 (6명 이상)" />
          <ResultRow label="청약통장 가입기간" value={`${result.account}점`} sub="최대 17점 (15년 이상)" />
          <ResultRow label="총 가점" value={`${result.total}점 / 84점`} highlight />

          <div style={{ marginTop: 16, background: '#f8fafc', borderRadius: 10, padding: '14px 16px', fontSize: 12, color: '#555', lineHeight: 1.8 }}>
            <strong style={{ color: '#1e3a5f' }}>📌 가점제 당첨 참고 기준 (서울 기준)</strong><br/>
            · 강남3구 인기 단지: 60~70점대<br/>
            · 서울 일반 단지: 50~60점대<br/>
            · 경기·인천: 40~55점대<br/>
            · 지방: 30~50점대<br/>
            <span style={{ color: '#888', fontSize: 11 }}>※ 단지·면적·시기에 따라 크게 다를 수 있습니다</span>
          </div>
          <ShareResultBtn params={{ tab: "subscription", homelessYears: result.hy, dependents: result.dep0, accountYears: result.ay }} />
        </div>
      )}
    </Card>
  );
}

// 7. 전월세 전환율
type ConversionMode = 'toMonthly' | 'toJeonse' | 'calcRate';

function ConversionCalc() {
  const [mode, setMode] = useState<ConversionMode>('toMonthly');
  const [jeonse, setJeonse] = useState('');
  const [deposit, setDeposit] = useState('');
  const [monthly, setMonthly] = useState('');
  const [rate, setRate] = useState('');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('tab') !== 'conversion') return;
    const m = (sp.get('mode') || 'toMonthly') as ConversionMode;
    const j = sp.get('jeonse') || '', d = sp.get('deposit') || '', mo = sp.get('monthly') || '', r = sp.get('rate') || '';
    setMode(m); setJeonse(j); setDeposit(d); setMonthly(mo); setRate(r);
  }, []);

  function calc() {
    if (mode === 'toMonthly') {
      const j = parseWon(jeonse), d = parseWon(deposit), r = parseFloat(rate);
      if (!j || !r) return;
      const diff = j - d;
      if (diff <= 0) return;
      setResult({ mode, monthlyRent: Math.round(diff * (r / 100) / 12), diff, rate: r, j, d, r: rate });
    } else if (mode === 'toJeonse') {
      const d = parseWon(deposit), m = parseWon(monthly), r = parseFloat(rate);
      if (!m || !r) return;
      setResult({ mode, jeonseAmt: d + Math.round(m * 12 / (r / 100)), rate: r, d, m: monthly, r: rate });
    } else {
      const j = parseWon(jeonse), d = parseWon(deposit), m = parseWon(monthly);
      if (!j || !m) return;
      const diff = j - d;
      if (diff <= 0) return;
      setResult({ mode, calcRate: m * 12 / diff * 100, diff, j, d, m: monthly });
    }
  }

  const LEGAL_CAP = 7.0;

  return (
    <Card title="전월세 전환율 계산기">
      <p style={{ fontSize: 13, color: '#6b7280', marginTop: 0, marginBottom: 18, lineHeight: 1.6 }}>
        전세를 월세로, 월세를 전세로 전환하거나 <strong>전월세 전환율</strong>을 계산합니다.
        전환율 계산 시 법정 상한 초과 여부도 확인해드립니다.
      </p>
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginBottom: 18, fontSize: 12, color: '#1d4ed8', lineHeight: 1.8 }}>
        📌 법정 전월세 전환율 상한: <strong>기준금리 + 3.5%p</strong> (주택임대차보호법 제7조의2)<br/>
        · 현재 한국은행 기준금리 기준으로 상한 약 {LEGAL_CAP}% 수준<br/>
        · 법정 상한 초과 시 임차인은 초과분 반환 청구 가능
      </div>

      <Field label="계산 방식">
        <select style={selectStyle} value={mode} onChange={e => { setMode(e.target.value as ConversionMode); setResult(null); }}>
          <option value="toMonthly">전세 → 월세 전환 (월세 계산)</option>
          <option value="toJeonse">월세 → 전세 전환 (전세금 계산)</option>
          <option value="calcRate">전환율 계산</option>
        </select>
      </Field>

      {mode === 'toMonthly' && (<>
        <Field label="현재 전세금"><WonInput placeholder="예: 300,000,000" value={jeonse} onChange={setJeonse} /></Field>
        <Field label="월세 전환 시 보증금 (없으면 0)"><WonInput placeholder="예: 50,000,000" value={deposit} onChange={setDeposit} /></Field>
        <Field label="전환율 (연, %)">
          <input style={inputStyle} type="number" step="0.1" placeholder="예: 6.0" value={rate} onChange={e => setRate(e.target.value)} />
          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>※ 법정 상한 약 {LEGAL_CAP}% 이내 권장</div>
        </Field>
      </>)}

      {mode === 'toJeonse' && (<>
        <Field label="현재 월세 보증금"><WonInput placeholder="예: 50,000,000" value={deposit} onChange={setDeposit} /></Field>
        <Field label="월세"><WonInput placeholder="예: 800,000" value={monthly} onChange={setMonthly} /></Field>
        <Field label="전환율 (연, %)">
          <input style={inputStyle} type="number" step="0.1" placeholder="예: 6.0" value={rate} onChange={e => setRate(e.target.value)} />
          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>※ 법정 상한 약 {LEGAL_CAP}% 이내 권장</div>
        </Field>
      </>)}

      {mode === 'calcRate' && (<>
        <Field label="전세금 (또는 기존 보증금)"><WonInput placeholder="예: 300,000,000" value={jeonse} onChange={setJeonse} /></Field>
        <Field label="월세 보증금 (없으면 0)"><WonInput placeholder="예: 50,000,000" value={deposit} onChange={setDeposit} /></Field>
        <Field label="월세"><WonInput placeholder="예: 800,000" value={monthly} onChange={setMonthly} /></Field>
      </>)}

      <CalcBtn onClick={calc} />

      {result && (
        <div style={{ marginTop: 20 }}>
          {result.mode === 'toMonthly' && (<>
            <ResultRow label="전환 기준 금액 (전세금 − 보증금)" value={won(result.diff)} />
            <ResultRow label="적용 전환율" value={`연 ${result.rate}%`} />
            <ResultRow label="전환 후 월세" value={won(result.monthlyRent)} highlight />
            <div style={{ marginTop: 8, padding: '10px 14px', background: '#f8faff', borderRadius: 8, fontSize: 12, color: '#555', lineHeight: 1.8 }}>
              💡 월세 외 관리비·공과금 별도 확인<br/>
              · 전환율이 {LEGAL_CAP}% 이하인지 확인하세요
            </div>
          </>)}
          {result.mode === 'toJeonse' && (<>
            <ResultRow label="환산 전세금" value={won(result.jeonseAmt)} highlight />
            <ResultRow label="적용 전환율" value={`연 ${result.rate}%`} />
            <div style={{ marginTop: 8, padding: '10px 14px', background: '#f8faff', borderRadius: 8, fontSize: 12, color: '#555', lineHeight: 1.8 }}>
              💡 실제 전세 협의 시 시세와 비교하세요<br/>
              · 전환율이 낮을수록 전세금이 높아집니다
            </div>
          </>)}
          {result.mode === 'calcRate' && (<>
            <ResultRow label="전환 기준 금액 (전세금 − 보증금)" value={won(result.diff)} />
            <ResultRow label="전월세 전환율" value={`연 ${result.calcRate.toFixed(2)}%`} highlight />
            <div style={{
              marginTop: 8, padding: '12px 14px', borderRadius: 8, fontSize: 12, lineHeight: 1.8,
              background: result.calcRate > LEGAL_CAP ? '#fef2f2' : '#f0fdf4',
              color: result.calcRate > LEGAL_CAP ? '#dc2626' : '#059669',
            }}>
              {result.calcRate > LEGAL_CAP
                ? `⚠️ 법정 상한(약 ${LEGAL_CAP}%)을 ${(result.calcRate - LEGAL_CAP).toFixed(2)}%p 초과합니다.\n임차인은 초과 임대료 반환 청구가 가능합니다.`
                : `✅ 법정 상한(약 ${LEGAL_CAP}%) 이내의 전환율입니다.`}
            </div>
          </>)}
          <ShareResultBtn params={{
            tab: 'conversion', mode: result.mode,
            jeonse, deposit, monthly, rate,
          }} />
        </div>
      )}
    </Card>
  );
}

const COMPS: Record<string, React.ComponentType> = {
  loan: LoanCalc, intermediate: IntermediateCalc, acquisition: AcquisitionCalc, brokerage: BrokerageCalc, roi: ROICalc,
  subscription: SubscriptionCalc, conversion: ConversionCalc,
};

export default function Calculator() {
  const [active, setActive] = useState('loan');

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab && COMPS[tab]) setActive(tab);
  }, []);
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