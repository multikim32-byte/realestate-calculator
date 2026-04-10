import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../public/cards');
mkdirSync(OUT, { recursive: true });

async function save(svg, name) {
  const buf = Buffer.from(svg);
  await sharp(buf).resize(1080, 1080).png().toFile(join(OUT, name));
  console.log('✓', name);
}

// ── 카드 1: 커버 ──────────────────────────────────────────────────────────────
const card1 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="bg1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e3a8a"/>
      <stop offset="100%" style="stop-color:#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#bg1)"/>

  <!-- 배경 장식 원 -->
  <circle cx="900" cy="150" r="280" fill="white" opacity="0.04"/>
  <circle cx="180" cy="900" r="220" fill="white" opacity="0.04"/>
  <circle cx="960" cy="820" r="160" fill="white" opacity="0.06"/>

  <!-- 아파트 실루엣 -->
  <rect x="100" y="560" width="160" height="340" rx="8" fill="white" opacity="0.08"/>
  <rect x="280" y="480" width="190" height="420" rx="8" fill="white" opacity="0.08"/>
  <rect x="490" y="520" width="170" height="380" rx="8" fill="white" opacity="0.08"/>
  <rect x="680" y="440" width="210" height="460" rx="8" fill="white" opacity="0.08"/>
  <rect x="910" y="510" width="130" height="390" rx="8" fill="white" opacity="0.08"/>
  <rect x="60" y="890" width="980" height="8" rx="4" fill="white" opacity="0.15"/>

  <!-- 메인 텍스트 -->
  <text x="540" y="300" font-size="52" text-anchor="middle"
    font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fill="white" opacity="0.7" font-weight="400" letter-spacing="8">REAL ESTATE</text>

  <text x="540" y="420" font-size="128" text-anchor="middle"
    font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fill="white" font-weight="900" letter-spacing="-4">청약정보</text>

  <text x="540" y="510" font-size="128" text-anchor="middle"
    font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fill="#60a5fa" font-weight="900" letter-spacing="-4">한눈에</text>

  <!-- 구분선 -->
  <rect x="390" y="560" width="300" height="3" rx="2" fill="white" opacity="0.3"/>

  <!-- 서브 텍스트 -->
  <text x="540" y="640" font-size="44" text-anchor="middle"
    font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fill="white" opacity="0.85" font-weight="400">청약 일정 · 실거래가 · 부동산 계산기</text>

  <text x="540" y="700" font-size="44" text-anchor="middle"
    font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fill="white" opacity="0.85" font-weight="400">전부 무료로 한 곳에서</text>

  <!-- URL 배지 -->
  <rect x="340" y="820" width="400" height="72" rx="36" fill="white" opacity="0.15"/>
  <text x="540" y="866" font-size="38" text-anchor="middle"
    font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fill="white" font-weight="700">www.mk-land.kr</text>

  <!-- 페이지 번호 -->
  <text x="540" y="990" font-size="28" text-anchor="middle"
    font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fill="white" opacity="0.4">01 / 05</text>
</svg>`;

// ── 카드 2: 청약 달력 ─────────────────────────────────────────────────────────
const card2 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">
  <rect width="1080" height="1080" fill="#f0f9ff"/>

  <!-- 상단 헤더 -->
  <rect width="1080" height="220" fill="#1d4ed8"/>
  <circle cx="900" cy="80" r="180" fill="white" opacity="0.05"/>
  <text x="80" y="110" font-size="36" font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fill="white" opacity="0.7" font-weight="400">기능 소개 ①</text>
  <text x="80" y="185" font-size="88" font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fill="white" font-weight="900">📅 청약 달력</text>

  <!-- 달력 카드 목업 -->
  <rect x="60" y="260" width="960" height="680" rx="24" fill="white"
    style="filter:drop-shadow(0 4px 24px rgba(0,0,0,0.10))"/>

  <!-- 달력 헤더 -->
  <rect x="60" y="260" width="960" height="80" rx="0" fill="#1d4ed8" opacity="0.08"/>
  <text x="540" y="315" font-size="38" text-anchor="middle" font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fill="#1e3a8a" font-weight="700">2026년 4월 청약 일정</text>

  <!-- 요일 헤더 -->
  ${['일','월','화','수','목','금','토'].map((d,i) => `
  <text x="${120 + i*132}" y="395" font-size="30" text-anchor="middle"
    font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fill="${i===0?'#ef4444':i===6?'#3b82f6':'#6b7280'}" font-weight="600">${d}</text>`).join('')}

  <!-- 날짜 칸 -->
  ${[...Array(5)].map((_,row) =>
    [...Array(7)].map((_,col) => {
      const day = row*7+col-2; // 4월 1일 = 수요일(col=3)부터
      if(day<1||day>30) return '';
      const x = 120+col*132, y = 440+row*95;
      const hasEvent = [5,6,7,12,13,14,20,21,25,26,27].includes(day);
      const isToday = day===10;
      return `
      ${isToday?`<circle cx="${x}" cy="${y+10}" r="32" fill="#1d4ed8" opacity="0.15"/>`:''}
      <text x="${x}" y="${y+20}" font-size="30" text-anchor="middle"
        font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
        fill="${col===0?'#ef4444':col===6?'#3b82f6':isToday?'#1d4ed8':'#374151'}"
        font-weight="${isToday?'900':'500'}">${day}</text>
      ${hasEvent?`<rect x="${x-46}" y="${y+30}" width="92" height="22" rx="11" fill="#dbeafe"/>
      <text x="${x}" y="${y+46}" font-size="17" text-anchor="middle"
        font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
        fill="#1d4ed8" font-weight="600">청약</text>`:''}`;
    }).join('')
  ).join('')}

  <!-- 범례 -->
  <rect x="120" y="910" width="22" height="22" rx="11" fill="#dbeafe"/>
  <text x="152" y="928" font-size="28" font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fill="#6b7280">청약 접수일</text>
  <circle cx="430" cy="920" r="11" fill="#1d4ed8" opacity="0.3"/>
  <text x="452" y="928" font-size="28" font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fill="#6b7280">오늘</text>

  <!-- URL -->
  <text x="540" y="1010" font-size="30" text-anchor="middle"
    font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fill="#9ca3af">www.mk-land.kr/calendar</text>
  <text x="540" y="1055" font-size="26" text-anchor="middle"
    font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fill="#1d4ed8" font-weight="600">02 / 05</text>
</svg>`;

// ── 카드 3: 실거래가 ─────────────────────────────────────────────────────────
const card3 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">
  <rect width="1080" height="1080" fill="#f8fafc"/>

  <!-- 상단 헤더 -->
  <rect width="1080" height="220" fill="#0f172a"/>
  <circle cx="900" cy="80" r="180" fill="white" opacity="0.03"/>
  <text x="80" y="110" font-size="36" font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fill="white" opacity="0.5" font-weight="400">기능 소개 ②</text>
  <text x="80" y="185" font-size="88" font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fill="white" font-weight="900">📊 실거래가 조회</text>

  <!-- 메인 카드 -->
  <rect x="60" y="260" width="960" height="700" rx="24" fill="white"
    style="filter:drop-shadow(0 4px 24px rgba(0,0,0,0.08))"/>

  <!-- 검색 바 -->
  <rect x="100" y="300" width="880" height="72" rx="36" fill="#f1f5f9"/>
  <text x="180" y="346" font-size="34" font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fill="#94a3b8">🔍  지역 또는 단지명 검색</text>

  <!-- 거래 리스트 아이템 -->
  ${[
    { name: '래미안원베일리', dong: '반포동', area: '84.9㎡(25평)', floor: '15층', price: '67.5억', date: '2026.03.28', up: true },
    { name: '아크로리버파크', dong: '반포동', area: '59.9㎡(18평)', floor: '8층', price: '43억', date: '2026.03.25', up: true },
    { name: '헬리오시티', dong: '개포동', area: '84.8㎡(25평)', floor: '22층', price: '28억', date: '2026.03.22', up: false },
    { name: '마포래미안푸르지오', dong: '아현동', area: '114.7㎡(34평)', floor: '11층', price: '24.5억', date: '2026.03.20', up: true },
    { name: '은마아파트', dong: '대치동', area: '76.7㎡(23평)', floor: '6층', price: '29억', date: '2026.03.18', up: false },
  ].map((t, i) => `
    <rect x="100" y="${400 + i*92}" width="880" height="82" rx="12"
      fill="${i%2===0?'#f8fafc':'white'}" stroke="#f1f5f9" stroke-width="1"/>
    <text x="130" y="${440 + i*92}" font-size="30" font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
      fill="#1e293b" font-weight="700">${t.name}</text>
    <text x="130" y="${468 + i*92}" font-size="24" font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
      fill="#94a3b8">${t.dong} · ${t.area} · ${t.floor}</text>
    <text x="940" y="${440 + i*92}" font-size="32" text-anchor="end" font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
      fill="${t.up?'#dc2626':'#2563eb'}" font-weight="800">${t.price}</text>
    <text x="940" y="${468 + i*92}" font-size="22" text-anchor="end" font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
      fill="#94a3b8">${t.date}</text>
  `).join('')}

  <!-- 지도 아이콘 힌트 -->
  <rect x="100" y="870" width="880" height="56" rx="28" fill="#eff6ff" stroke="#bfdbfe" stroke-width="2"/>
  <text x="540" y="906" font-size="28" text-anchor="middle" font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fill="#1d4ed8" font-weight="600">🗺️  카카오맵으로 위치 확인까지 가능</text>

  <!-- URL -->
  <text x="540" y="1010" font-size="30" text-anchor="middle"
    font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fill="#9ca3af">www.mk-land.kr/trade</text>
  <text x="540" y="1055" font-size="26" text-anchor="middle"
    font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fill="#1d4ed8" font-weight="600">03 / 05</text>
</svg>`;

// ── 카드 4: 계산기 ─────────────────────────────────────────────────────────
const card4 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">
  <rect width="1080" height="1080" fill="#fafafa"/>

  <!-- 상단 헤더 -->
  <rect width="1080" height="220" fill="#059669"/>
  <circle cx="900" cy="80" r="180" fill="white" opacity="0.05"/>
  <text x="80" y="110" font-size="36" font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fill="white" opacity="0.7" font-weight="400">기능 소개 ③</text>
  <text x="80" y="185" font-size="88" font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fill="white" font-weight="900">🧮 부동산 계산기</text>

  <!-- 계산기 카드 4개 -->
  ${[
    { emoji:'🏦', title:'주택담보대출', sub:'월 상환액·총이자 계산', color:'#eff6ff', border:'#bfdbfe', tc:'#1d4ed8' },
    { emoji:'🏷️', title:'취득세 계산기', sub:'주택 수·가격별 세율 자동 계산', color:'#f0fdf4', border:'#bbf7d0', tc:'#059669' },
    { emoji:'🤝', title:'중개수수료 계산', sub:'거래 유형별 법정 수수료', color:'#fdf4ff', border:'#e9d5ff', tc:'#7c3aed' },
    { emoji:'📈', title:'투자수익률 계산', sub:'ROI·월세 수익률 분석', color:'#fff7ed', border:'#fed7aa', tc:'#ea580c' },
    { emoji:'📋', title:'청약 가점 계산', sub:'청약 가점 점수 자동 산출', color:'#fff1f2', border:'#fecdd3', tc:'#e11d48' },
    { emoji:'📤', title:'URL 공유 기능', sub:'계산 결과를 링크로 공유', color:'#f0f9ff', border:'#bae6fd', tc:'#0284c7' },
  ].map((c, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 60 + col * 500, y = 270 + row * 220;
    return `
    <rect x="${x}" y="${y}" width="460" height="190" rx="20" fill="${c.color}" stroke="${c.border}" stroke-width="2"/>
    <text x="${x+36}" y="${y+70}" font-size="52"
      font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif">${c.emoji}</text>
    <text x="${x+36}" y="${y+120}" font-size="34" font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
      fill="${c.tc}" font-weight="800">${c.title}</text>
    <text x="${x+36}" y="${y+158}" font-size="26" font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
      fill="#6b7280">${c.sub}</text>
    `;
  }).join('')}

  <!-- 강조 텍스트 -->
  <rect x="60" y="985" width="960" height="52" rx="26" fill="#ecfdf5"/>
  <text x="540" y="1019" font-size="28" text-anchor="middle" font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fill="#059669" font-weight="700">✅  모두 무료 · 회원가입 불필요 · 광고 없음</text>

  <text x="540" y="1062" font-size="26" text-anchor="middle"
    font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fill="#1d4ed8" font-weight="600">04 / 05</text>
</svg>`;

// ── 카드 5: CTA ─────────────────────────────────────────────────────────────
const card5 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="bg5" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="100%" style="stop-color:#1e3a8a"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#bg5)"/>

  <!-- 배경 장식 -->
  <circle cx="200" cy="200" r="300" fill="white" opacity="0.03"/>
  <circle cx="880" cy="880" r="350" fill="#1d4ed8" opacity="0.15"/>
  <circle cx="900" cy="200" r="200" fill="#3b82f6" opacity="0.08"/>

  <!-- 3가지 핵심 가치 -->
  ${[
    { y: 200, emoji: '📅', text: '전국 청약 일정을 달력으로' },
    { y: 360, emoji: '📊', text: '인근 아파트 실거래가 조회' },
    { y: 520, emoji: '🧮', text: '취득세·대출·수익률 계산기' },
  ].map(v => `
    <rect x="100" y="${v.y}" width="880" height="110" rx="20" fill="white" opacity="0.06"/>
    <text x="160" y="${v.y+68}" font-size="60" font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif">${v.emoji}</text>
    <text x="250" y="${v.y+72}" font-size="46" font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
      fill="white" font-weight="700">${v.text}</text>
  `).join('')}

  <!-- 구분선 -->
  <rect x="200" y="660" width="680" height="2" rx="1" fill="white" opacity="0.15"/>

  <!-- CTA 메인 -->
  <text x="540" y="750" font-size="56" text-anchor="middle"
    font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fill="white" opacity="0.6" font-weight="400">지금 바로</text>

  <text x="540" y="840" font-size="96" text-anchor="middle"
    font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fill="#60a5fa" font-weight="900" letter-spacing="-3">무료로 사용하세요</text>

  <!-- URL 버튼 -->
  <rect x="190" y="890" width="700" height="100" rx="50" fill="#1d4ed8"/>
  <rect x="193" y="893" width="694" height="94" rx="47" fill="none" stroke="#60a5fa" stroke-width="2" opacity="0.5"/>
  <text x="540" y="954" font-size="48" text-anchor="middle"
    font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fill="white" font-weight="800" letter-spacing="1">www.mk-land.kr</text>

  <!-- 페이지 -->
  <text x="540" y="1055" font-size="26" text-anchor="middle"
    font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fill="white" opacity="0.3">05 / 05</text>
</svg>`;

await save(card1, 'card-01-cover.png');
await save(card2, 'card-02-calendar.png');
await save(card3, 'card-03-trade.png');
await save(card4, 'card-04-calculator.png');
await save(card5, 'card-05-cta.png');

console.log('\n✅ 카드뉴스 5장 생성 완료 → public/cards/');
