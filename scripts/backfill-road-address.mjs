/**
 * 기존 단지 도로명주소 백필 스크립트
 *
 * lat/lng 있는 단지 → Kakao 역지오코딩 → road_address 저장
 *
 * 실행: node scripts/backfill-road-address.mjs
 * 옵션:
 *   --limit=N   최대 N개 처리 (기본: 전체)
 *   --dry-run   저장 없이 결과만 확인
 */

import { setTimeout as sleep } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const KAKAO_KEY = process.env.KAKAO_REST_API_KEY?.trim();
const SB_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SB_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!KAKAO_KEY || !SB_URL || !SB_KEY) {
  console.error('❌ 필수 환경변수 없음');
  process.exit(1);
}

const sb     = createClient(SB_URL, SB_KEY);
const dryRun = process.argv.includes('--dry-run');
const limit  = parseInt(process.argv.find(a => a.startsWith('--limit='))?.replace('--limit=', '') ?? '0') || Infinity;

// Kakao 좌표 → 주소 변환 (coord2address)
const KAKAO_COORD = 'https://dapi.kakao.com/v2/local/geo/coord2address.json';
async function reverseGeocode(lat, lng) {
  try {
    const url = `${KAKAO_COORD}?x=${lng}&y=${lat}`;
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const json = await res.json();
    const doc = json?.documents?.[0];
    return doc?.road_address?.address_name || null;
  } catch {
    return null;
  }
}

async function main() {
  console.log(`🏗️  도로명주소 백필 시작 | dry-run: ${dryRun}\n`);

  // road_address가 없고 lat/lng 있는 단지
  let from = 0;
  const targets = [];
  while (true) {
    const { data, error } = await sb
      .from('apartment_complexes')
      .select('kapt_code, name, lat, lng')
      .is('road_address', null)
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .order('kapt_code')
      .range(from, from + 999);
    if (error || !data?.length) break;
    targets.push(...data);
    if (data.length < 1000 || targets.length >= limit) break;
    from += 1000;
  }

  const todo = targets.slice(0, limit === Infinity ? targets.length : limit);
  console.log(`📍 대상: ${todo.length.toLocaleString()}개\n`);

  let done = 0, success = 0, fail = 0;
  const now = new Date().toISOString();

  for (const c of todo) {
    const addr = await reverseGeocode(c.lat, c.lng);
    await sleep(60); // Kakao QPS 제한

    if (addr && !dryRun) {
      await sb.from('apartment_complexes')
        .update({ road_address: addr, updated_at: now })
        .eq('kapt_code', c.kapt_code);
      success++;
    } else if (addr) {
      success++;
    } else {
      fail++;
    }

    done++;
    if (done % 500 === 0 || done === todo.length) {
      process.stdout.write(`\r  진행: ${done}/${todo.length} | 성공: ${success} | 실패: ${fail}   `);
    }
  }

  console.log(`\n\n✅ 완료: 성공 ${success.toLocaleString()} / 실패 ${fail.toLocaleString()}`);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
