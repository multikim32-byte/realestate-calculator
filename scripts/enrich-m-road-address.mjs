/**
 * M-prefix 단지 도로명주소 역지오코딩
 *
 * lat/lng는 있지만 road_address가 없는 M-prefix 단지에
 * Kakao coord2address API로 도로명주소를 채운다.
 *
 * 실행: node scripts/enrich-m-road-address.mjs
 * 옵션: --dry-run
 */

import { createClient }        from '@supabase/supabase-js';
import { config }              from 'dotenv';
import { resolve }             from 'node:path';
import { fileURLToPath }       from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const sb        = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const KAKAO_KEY = process.env.KAKAO_REST_API_KEY;
const dryRun    = process.argv.includes('--dry-run');

if (!KAKAO_KEY) { console.error('❌ KAKAO_REST_API_KEY 없음'); process.exit(1); }

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`;
    const res  = await fetch(url, {
      headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
      signal: AbortSignal.timeout(5000),
    });
    const json = await res.json();
    const doc  = json.documents?.[0];
    if (!doc) return null;
    return doc.road_address?.address_name ?? null;
  } catch {
    return null;
  }
}

async function main() {
  console.log(`🗺️  M-prefix 역지오코딩 시작 (${dryRun ? 'DRY-RUN' : '실제 저장'})\n`);

  const rows = [];
  let from = 0;
  while (true) {
    const { data } = await sb.from('apartment_complexes')
      .select('kapt_code, name, lat, lng')
      .like('kapt_code', 'M%')
      .is('road_address', null)
      .not('lat', 'is', null)
      .neq('source', 'kapt_deprecated')
      .range(from, from + 999);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`📍 대상: ${rows.length.toLocaleString()}개\n`);

  let done = 0, failed = 0;
  const BATCH = 100;

  for (let i = 0; i < rows.length; i++) {
    const r    = rows[i];
    const addr = await reverseGeocode(r.lat, r.lng);

    if (addr) {
      if (!dryRun) {
        await sb.from('apartment_complexes').update({ road_address: addr }).eq('kapt_code', r.kapt_code);
      }
      done++;
    } else {
      failed++;
    }

    if ((i + 1) % BATCH === 0 || i + 1 === rows.length) {
      process.stdout.write(`\r  완료: ${done} | 실패: ${failed} / ${rows.length}`);
    }
    await sleep(55); // Kakao 분당 1800건 제한 내 유지
  }

  console.log(`\n\n✅ 완료: ${done}개 road_address 업데이트${dryRun ? ' (DRY-RUN)' : ''}, 실패: ${failed}개`);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
