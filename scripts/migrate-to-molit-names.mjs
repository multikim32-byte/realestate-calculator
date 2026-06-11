/**
 * MOLIT 단지명 기준 마이그레이션
 *
 * 단지집사의 단지명/molit_key를 MOLIT 실거래 기준으로 통일한다.
 *
 * Phase 1: A-prefix + molit_key 있는 단지 → 이름을 MOLIT apt_name으로 업데이트
 * Phase 2: A-prefix + molit_key 없는 단지 → kapt_addr 지번으로 apt_trades 매칭
 * Phase 3: 중복된 M-prefix (같은 molit_key가 A-prefix에도 있는 것) → deprecated 처리
 *
 * 실행: node scripts/migrate-to-molit-names.mjs
 * 옵션:
 *   --dry-run   DB 저장 없이 결과만 출력
 *   --phase=1   특정 단계만 실행 (1, 2, 3)
 *   --limit=N   처리 건수 제한 (테스트용)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const phaseArg = args.find(a => a.startsWith('--phase='))?.replace('--phase=', '');
const limitArg = parseInt(args.find(a => a.startsWith('--limit='))?.replace('--limit=', '') ?? '0');

const runPhase = (n) => !phaseArg || phaseArg === String(n);

// ── kapt_addr에서 지번 추출 ───────────────────────────────────────────────────
// 예: "경상남도 창원성산구 대원동 80 대원대동2차" → { dong: "대원동", jibun: "80" }
// 예: "서울특별시 강남구 개포동 660-1 단지명" → { dong: "개포동", jibun: "660-1" }
function parseKaptAddr(kapt_addr) {
  if (!kapt_addr) return null;
  // 패턴: [시도] [시군구] [읍면동] [지번] [단지명...]
  // 지번: 숫자(-숫자)? 형태
  const m = kapt_addr.match(/([가-힣]+(?:동|읍|면|리))\s+([\d]+-?[\d]*)/);
  if (!m) return null;
  return { dong: m[1], jibun: m[2] };
}

// ── Phase 1: molit_key 있는 A-prefix → 이름 업데이트 ─────────────────────────
async function phase1() {
  console.log('\n━━━ Phase 1: A-prefix 이름 MOLIT 기준으로 업데이트 ━━━\n');

  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb.from('apartment_complexes')
      .select('kapt_code, name, molit_key, slug')
      .like('kapt_code', 'A%')
      .not('molit_key', 'is', null)
      .order('kapt_code')
      .range(from, from + 999);
    if (error || !data?.length) break;
    rows.push(...data);
    from += 1000;
    if (data.length < 1000) break;
  }
  console.log(`대상: ${rows.length.toLocaleString()}개`);

  const toUpdate = [];
  for (const r of rows) {
    const molitName = r.molit_key.split('|')[1];
    if (!molitName || r.name === molitName) continue;
    toUpdate.push({ kapt_code: r.kapt_code, oldName: r.name, newName: molitName });
  }
  console.log(`이름 불일치 (업데이트 필요): ${toUpdate.length.toLocaleString()}개`);

  const list = limitArg ? toUpdate.slice(0, limitArg) : toUpdate;

  let done = 0;
  for (let i = 0; i < list.length; i += 100) {
    const batch = list.slice(i, i + 100);
    if (!dryRun) {
      for (const u of batch) {
        await sb.from('apartment_complexes')
          .update({ name: u.newName })
          .eq('kapt_code', u.kapt_code);
      }
    }
    done += batch.length;
    process.stdout.write(`\r  업데이트: ${done}/${list.length}`);
  }

  console.log(`\n✅ Phase 1 완료: ${list.length}개 이름 변경${dryRun ? ' (DRY-RUN)' : ''}`);
  if (dryRun && list.length > 0) {
    console.log('  샘플:', list.slice(0, 5).map(u => `"${u.oldName}" → "${u.newName}"`).join('\n         '));
  }
  return list.length;
}

// ── Phase 2: molit_key 없는 A-prefix → jibun 매칭 ───────────────────────────
async function phase2() {
  console.log('\n━━━ Phase 2: kapt_addr 지번으로 molit_key + 이름 매칭 ━━━\n');

  // molit_key 없는 A-prefix with kapt_addr
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb.from('apartment_complexes')
      .select('kapt_code, name, kapt_addr, sigungu, sido')
      .like('kapt_code', 'A%')
      .is('molit_key', null)
      .not('kapt_addr', 'is', null)
      .order('kapt_code')
      .range(from, from + 999);
    if (error || !data?.length) break;
    rows.push(...data);
    from += 1000;
    if (data.length < 1000) break;
  }
  console.log(`대상: ${rows.length.toLocaleString()}개`);

  // lawd_cd 룩업: sigungu → lawd_cd[] (기존 molit_key에서 추출)
  console.log('lawd_cd 룩업 테이블 구축 중...');
  const { data: molitKeys } = await sb.from('apartment_complexes')
    .select('sigungu, molit_key')
    .not('molit_key', 'is', null)
    .limit(5000);

  const lawdMap = new Map(); // sigungu → Set<lawd_cd>
  for (const r of molitKeys ?? []) {
    const lawd = r.molit_key?.split('|')[0];
    if (!lawd || !r.sigungu) continue;
    if (!lawdMap.has(r.sigungu)) lawdMap.set(r.sigungu, new Set());
    lawdMap.get(r.sigungu).add(lawd);
  }
  console.log(`lawd_cd 룩업: ${lawdMap.size}개 시군구\n`);

  const list = limitArg ? rows.slice(0, limitArg) : rows;

  let matched = 0, ambiguous = 0, noMatch = 0;
  const updates = [];

  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    const parsed = parseKaptAddr(r.kapt_addr);
    if (!parsed) { noMatch++; continue; }

    const lawdSet = lawdMap.get(r.sigungu);
    if (!lawdSet?.size) { noMatch++; continue; }

    const lawdCds = [...lawdSet];

    // apt_trades에서 같은 지번 찾기
    let tradeMatches = null;
    for (const lawd of lawdCds) {
      const { data } = await sb.from('apt_trades')
        .select('apt_name, lawd_cd, dong')
        .eq('lawd_cd', lawd)
        .eq('jibun', parsed.jibun)
        .eq('deal_type', 'T')
        .gte('deal_ym', '202001')
        .limit(20);
      if (data?.length) {
        tradeMatches = data;
        break;
      }
    }

    if (!tradeMatches?.length) { noMatch++; continue; }

    // 고유 apt_name 추출
    const uniqNames = [...new Set(tradeMatches.map(t => t.apt_name))];

    let chosenName = null;
    let chosenLawd = null;

    if (uniqNames.length === 1) {
      chosenName = uniqNames[0];
      chosenLawd = tradeMatches[0].lawd_cd;
      matched++;
    } else {
      // 여러 이름 → 정규화 유사도로 선택
      const norm = s => (s||'').replace(/[\s아파트]/g,'').toLowerCase();
      const baseNorm = norm(r.name);
      const best = uniqNames.find(n => norm(n) === baseNorm)
        ?? uniqNames.find(n => norm(n).includes(baseNorm.slice(0,4)) || baseNorm.includes(norm(n).slice(0,4)));
      if (best) {
        chosenName = best;
        chosenLawd = tradeMatches.find(t => t.apt_name === best)?.lawd_cd;
        matched++;
      } else {
        ambiguous++;
        continue;
      }
    }

    const newMolitKey = `${chosenLawd}|${chosenName}`;
    const nameChanged = r.name !== chosenName;
    updates.push({ kapt_code: r.kapt_code, molit_key: newMolitKey, newName: chosenName, nameChanged, oldName: r.name });

    if ((i + 1) % 50 === 0) {
      process.stdout.write(`\r  진행: ${i+1}/${list.length} | 매칭: ${matched} | 중복: ${ambiguous} | 미매칭: ${noMatch}`);
    }
  }
  console.log(`\r  진행: ${list.length}/${list.length} | 매칭: ${matched} | 중복: ${ambiguous} | 미매칭: ${noMatch}`);

  // DB 업데이트
  if (!dryRun && updates.length) {
    console.log(`\nDB 업데이트 중... (${updates.length}개)`);
    let saved = 0;
    for (const u of updates) {
      const upd = { molit_key: u.molit_key };
      if (u.nameChanged) upd.name = u.newName;
      const { error } = await sb.from('apartment_complexes').update(upd).eq('kapt_code', u.kapt_code);
      if (!error) saved++;
      else console.error(`\n⚠️  ${u.kapt_code}:`, error.message);
    }
    console.log(`✅ ${saved}개 업데이트 완료`);
  } else if (dryRun && updates.length > 0) {
    console.log('\nDRY-RUN 샘플:');
    updates.slice(0, 5).forEach(u =>
      console.log(`  "${u.oldName}" → molit_key=${u.molit_key}${u.nameChanged ? ` / 이름:"${u.newName}"` : ''}`)
    );
  }

  console.log(`✅ Phase 2 완료: ${matched}개 매칭${dryRun ? ' (DRY-RUN)' : ''}`);
  return matched;
}

// ── Phase 3: M-prefix 중복 제거 ──────────────────────────────────────────────
async function phase3() {
  console.log('\n━━━ Phase 3: M-prefix 중복 deprecated 처리 ━━━\n');

  // A-prefix의 모든 molit_key 수집
  const aMolits = new Set();
  let from = 0;
  while (true) {
    const { data } = await sb.from('apartment_complexes')
      .select('molit_key')
      .like('kapt_code', 'A%')
      .not('molit_key', 'is', null)
      .range(from, from + 999);
    if (!data?.length) break;
    data.forEach(r => aMolits.add(r.molit_key));
    from += 1000;
    if (data.length < 1000) break;
  }
  console.log(`A-prefix molit_key: ${aMolits.size.toLocaleString()}개`);

  // M-prefix 중 molit_key가 A-prefix에도 있는 것
  const mRows = [];
  from = 0;
  while (true) {
    const { data } = await sb.from('apartment_complexes')
      .select('kapt_code, name, molit_key, source')
      .like('kapt_code', 'M%')
      .not('molit_key', 'is', null)
      .neq('source', 'kapt_deprecated')
      .range(from, from + 999);
    if (!data?.length) break;
    mRows.push(...data.filter(r => aMolits.has(r.molit_key)));
    from += 1000;
    if (data.length < 1000) break;
  }
  console.log(`M-prefix 중복 (deprecated 처리 대상): ${mRows.length.toLocaleString()}개`);

  if (!dryRun && mRows.length) {
    const codes = mRows.map(r => r.kapt_code);
    for (let i = 0; i < codes.length; i += 200) {
      const batch = codes.slice(i, i + 200);
      await sb.from('apartment_complexes')
        .update({ source: 'kapt_deprecated' })
        .in('kapt_code', batch);
      process.stdout.write(`\r  deprecated: ${Math.min(i+200, codes.length)}/${codes.length}`);
    }
    console.log('\n');
  } else if (dryRun) {
    console.log('DRY-RUN 샘플:', mRows.slice(0, 5).map(r => r.name).join(', '));
  }

  console.log(`✅ Phase 3 완료: ${mRows.length}개 deprecated${dryRun ? ' (DRY-RUN)' : ''}`);
  return mRows.length;
}

// ── 메인 ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔄 MOLIT 단지명 기준 마이그레이션');
  console.log(`   모드: ${dryRun ? 'DRY-RUN (DB 저장 안 함)' : '실제 저장'}`);
  if (phaseArg) console.log(`   단계: Phase ${phaseArg}만 실행`);
  if (limitArg) console.log(`   제한: ${limitArg}건`);

  let p1 = 0, p2 = 0, p3 = 0;
  if (runPhase(1)) p1 = await phase1();
  if (runPhase(2)) p2 = await phase2();
  if (runPhase(3)) p3 = await phase3();

  console.log('\n🎉 전체 완료!');
  console.log(`   Phase 1 (이름 업데이트): ${p1.toLocaleString()}개`);
  console.log(`   Phase 2 (jibun 매칭): ${p2.toLocaleString()}개`);
  console.log(`   Phase 3 (M-prefix 중복 제거): ${p3.toLocaleString()}개`);
  console.log('\n   다음 단계: node scripts/enrich-prices.mjs --force  (avg_price 재계산)');
}

main().catch(e => { console.error('❌ 오류:', e); process.exit(1); });
