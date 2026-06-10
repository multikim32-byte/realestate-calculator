/**
 * T/J 타입 첫 번째 누락 구간 탐지 → 수집 범위 출력
 *
 * 출력 형식 (JSON):
 *   { "skip": true }                          ← 누락 없음
 *   { "from": "201601", "to": "201812" }      ← 수집 필요
 *
 * 동작: 201401부터 현재 전전달까지 월별 존재 여부 확인,
 *       첫 번째 누락월부터 최대 24개월 또는 연속 누락 끝까지 반환
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env.local') });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MAX_MONTHS = 24; // 1회 최대 수집 개월 수

function addMonths(ym, n) {
  let y = parseInt(ym.slice(0, 4)), m = parseInt(ym.slice(4, 6));
  m += n;
  while (m > 12) { m -= 12; y++; }
  while (m < 1) { m += 12; y--; }
  return `${y}${String(m).padStart(2, '0')}`;
}

// 수집 범위: 201401 ~ 지난달
const now = new Date();
now.setMonth(now.getMonth() - 1);
const lastYm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

const months = [];
for (let ym = '201401'; ym <= lastYm; ym = addMonths(ym, 1)) {
  months.push(ym);
}

// 각 월 존재 여부 확인 (chunk 단위로 체크해서 빠르게)
const CHUNK = 6; // 6개월씩 체크
const missing = [];

for (let i = 0; i < months.length; i += CHUNK) {
  const chunk = months.slice(i, i + CHUNK);
  const results = await Promise.all(
    chunk.map(ym =>
      sb.from('apt_trades')
        .select('deal_ym', { head: true, count: 'exact' })
        .in('deal_type', ['T', 'J'])
        .eq('deal_ym', ym)
        .then(({ count }) => ({ ym, exists: (count ?? 0) > 0 }))
    )
  );
  for (const { ym, exists } of results) {
    if (!exists) missing.push(ym);
  }
}

if (missing.length === 0) {
  process.stdout.write(JSON.stringify({ skip: true }));
  process.exit(0);
}

// 첫 번째 연속 누락 구간에서 최대 24개월
const from = missing[0];
let to = from;
for (let i = 1; i < missing.length && i < MAX_MONTHS; i++) {
  if (missing[i] === addMonths(missing[i - 1], 1)) {
    to = missing[i];
  } else {
    break;
  }
}

process.stdout.write(JSON.stringify({ from, to }));
