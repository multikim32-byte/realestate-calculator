/**
 * LAWD_CODE_MAP 전수 검증 — 카카오 주소 API의 법정동코드(b_code)와 대조
 * 실행: node scripts/validate-lawd-codes.mjs
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });
const KAKAO = process.env.KAKAO_REST_API_KEY;

const { LAWD_CODE_MAP } = await import('./lawd-codes.mjs');

let total = 0, mismatch = 0, unresolved = 0;
for (const [sido, list] of Object.entries(LAWD_CODE_MAP)) {
  for (const { name, code } of list) {
    total++;
    const q = `${sido} ${name}`;
    try {
      const r = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(q)}`,
        { headers: { Authorization: `KakaoAK ${KAKAO}` }, signal: AbortSignal.timeout(5000) });
      const j = await r.json();
      const doc = j.documents?.find(d => d.address?.b_code);
      const bcode = doc?.address?.b_code?.slice(0, 5);
      if (!bcode) { unresolved++; console.log(`  ❓ 확인불가: ${q} (map: ${code})`); }
      else if (bcode !== code) { mismatch++; console.log(`  ❌ 불일치: ${q} | map=${code} → 실제=${bcode}`); }
    } catch { unresolved++; console.log(`  ❓ API오류: ${q}`); }
    await sleep(60);
  }
}
console.log(`\n총 ${total}개 | 불일치 ${mismatch} | 확인불가 ${unresolved}`);
