import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env.local') });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 각 월별로 T/J 데이터 존재 여부 직접 체크 (1건만 조회)
const allMonths = [];
for (let y = 2014; y <= 2026; y++) {
  for (let m = 1; m <= (y === 2026 ? 5 : 12); m++) {
    allMonths.push(`${y}${String(m).padStart(2, '0')}`);
  }
}

console.log(`월별 T/J 존재 여부 확인 중... (총 ${allMonths.length}개월)`);

const present = [];
const missing = [];

for (const ym of allMonths) {
  const { data } = await sb.from('apt_trades')
    .select('deal_ym')
    .in('deal_type', ['T', 'J'])
    .eq('deal_ym', ym)
    .limit(1);

  if (data?.length) present.push(ym);
  else missing.push(ym);

  process.stdout.write(`\r  ${ym} | 보유: ${present.length}개월 | 누락: ${missing.length}개월`);
}

console.log('\n');

// 누락 구간 묶기
const gaps = [];
if (missing.length > 0) {
  let start = missing[0], prev = missing[0];
  for (let i = 1; i < missing.length; i++) {
    const cur = missing[i];
    const d = new Date(prev.slice(0,4)+'-'+prev.slice(4,6)+'-01');
    d.setMonth(d.getMonth() + 1);
    const next = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}`;
    if (cur !== next) { gaps.push({from:start, to:prev}); start = cur; }
    prev = cur;
  }
  gaps.push({from:start, to:prev});
}

console.log('=== 결과 ===');
console.log(`보유: ${present.length}개월 | 누락: ${missing.length}개월`);
if (present.length) console.log(`보유 범위: ${present[0]} ~ ${present[present.length-1]}`);

console.log('\n누락 구간:');
if (gaps.length === 0) {
  console.log('  ✅ 없음 - 전체 수집 완료!');
} else {
  for (const g of gaps) {
    const d1 = new Date(g.from.slice(0,4)+'-'+g.from.slice(4,6)+'-01');
    const d2 = new Date(g.to.slice(0,4)+'-'+g.to.slice(4,6)+'-01');
    const months = (d2.getFullYear()-d1.getFullYear())*12 + d2.getMonth()-d1.getMonth()+1;
    console.log(`  --from=${g.from} --to=${g.to}  (${months}개월)`);
  }
}
