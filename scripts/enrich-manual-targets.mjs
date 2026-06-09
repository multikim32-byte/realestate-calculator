/**
 * 수동 입력 대상 27개 단지 보강 스크립트
 *
 * 1) 청약홈 API 재시도 (--cheongak, 기본 실행)
 * 2) 청약홈 실패 시 apt_trades 자동 코드 생성
 * 3) 여전히 null이면 수동 입력 필요 목록 출력
 *
 * 실행:
 *   node scripts/enrich-manual-targets.mjs            # 청약홈 + apt_trades
 *   node scripts/enrich-manual-targets.mjs --dry-run  # DB 저장 없이 결과만 확인
 */

import { setTimeout as sleep } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const API_KEY = (process.env.PUBLIC_DATA_API_KEY ?? process.env.CHEONGAK_API_KEY)?.trim();
const SB_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SB_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SB_URL || !SB_KEY) { console.error('❌ Supabase 환경변수 없음'); process.exit(1); }

const supabase = createClient(SB_URL, SB_KEY);
const dryRun   = process.argv.includes('--dry-run');
const BASE     = 'https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1';

// ── 수동 입력 대상 27개 (메모리 기준) ────────────────────────────────────────
const TARGETS = [
  { kapt_code: 'A10020344', name: '이문아이파크자이',       sido: '서울', sigungu: '동대문구' },
  { kapt_code: 'A10020294', name: '잠실래미안아이파크',     sido: '서울', sigungu: '송파구' },
  { kapt_code: 'A10020363', name: '청담르엘',               sido: '서울', sigungu: '강남구' },
  { kapt_code: 'A10020950', name: '안양역푸르지오더샵',     sido: '경기', sigungu: '안양시만안구' },
  { kapt_code: 'A10020620', name: '인덕원자이SKVIEW',       sido: '경기', sigungu: '의왕시' },
  { kapt_code: 'A10022677', name: '북수원자이렉스비아',     sido: '경기', sigungu: '수원시장안구' },
  { kapt_code: 'A10022268', name: '평촌트리지아',           sido: '경기', sigungu: '안양시동안구' },
  { kapt_code: 'A10020103', name: '대명자이그랜드시티',     sido: '대구', sigungu: '남구' },
  { kapt_code: 'A10020585', name: '둔산자이아이파크',       sido: '대전', sigungu: '서구' },
  { kapt_code: 'A10020377', name: '광명센트럴아이파크',     sido: '경기', sigungu: '광명시' },
  { kapt_code: 'A10020302', name: '힐스테이트용인포레',     sido: '경기', sigungu: '용인시처인구' },
  { kapt_code: 'A10020154', name: '더파크비스타데시앙',     sido: '경기', sigungu: '광주시' },
  { kapt_code: 'A10023117', name: '이편한세상천안역',       sido: '충남', sigungu: '천안시동남구' },
  { kapt_code: 'A10024685', name: '청주동남1단지',          sido: '충북', sigungu: '청주시상당구' },
  { kapt_code: 'A10020163', name: '운암자이포레나2단지',    sido: '광주', sigungu: '북구' },
  { kapt_code: 'A10020257', name: '인천두산위브더센트럴',   sido: '인천', sigungu: '동구' },
  { kapt_code: 'A10020816', name: '둔산더샵엘리프2단지',    sido: '대전', sigungu: '서구' },
  { kapt_code: 'A44370903', name: '매탄주공5단지',          sido: '경기', sigungu: '수원시영통구' },
  { kapt_code: 'A10024077', name: '평촌래미안푸르지오',     sido: '경기', sigungu: '안양시동안구' },
  { kapt_code: 'A64190710', name: '칠성그린아파트',         sido: '경남', sigungu: '창원시의창구' },
  { kapt_code: 'A10020268', name: '더샵청주그리니티',       sido: '충북', sigungu: '청주시서원구' },
  { kapt_code: 'A10020264', name: '에코델타더베르힐',       sido: '부산', sigungu: '강서구' },
  { kapt_code: 'A70678607', name: '지산5단지',              sido: '대구', sigungu: '수성구' },
  { kapt_code: 'A10020128', name: '세교파라곤',             sido: '경기', sigungu: '오산시' },
  { kapt_code: 'A10020339', name: '파주금촌어울림',         sido: '경기', sigungu: '파주시' },
  { kapt_code: 'A10020221', name: '한화포레나유성',         sido: '대전', sigungu: '유성구' },
  { kapt_code: 'A70685005', name: '황금제3주공',            sido: '대구', sigungu: '수성구' },
];

// ── 청약홈 API ────────────────────────────────────────────────────────────────
function parseHouseTy(raw) {
  if (!raw) return null;
  const s = raw.trim();
  const m = s.match(/^(\d{3})\.(\d+)([A-Z]?)$/);
  if (!m) return null;
  return { exclusive_area: parseFloat(`${m[1]}.${m[2]}`), letter: m[3] ?? '' };
}

async function cheongakFetch(endpoint, params) {
  if (!API_KEY) return null;
  const qs = new URLSearchParams({ serviceKey: API_KEY, page: '1', perPage: '100', ...params });
  try {
    const res = await fetch(`${BASE}/${endpoint}?${qs}`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch { return null; }
}

async function fetchCheongakTypes(name, sigungu) {
  // 3가지 검색 키워드 시도
  const candidates = new Set([name, name.slice(0, 5), name.slice(0, 4)].filter(k => k.length >= 3));
  for (const kw of candidates) {
    const data = await cheongakFetch('getAPTLttotPblancDetail', { 'cond[HOUSE_NM::LIKE]': kw });
    if (!data?.length) { await sleep(80); continue; }

    // 시/군/구 주소 매칭
    const matched = data.filter(r => {
      const addr = r.HSSPLY_ADRES ?? '';
      return addr.includes(sigungu.slice(0, 3));
    });
    if (!matched.length) { await sleep(80); continue; }

    // house_manage_no로 주택형 조회
    for (const m of matched.slice(0, 2)) {
      const hno = m.HOUSE_MANAGE_NO ?? m.house_manage_no;
      if (!hno) continue;
      const types = await cheongakFetch('getAPTLttotPblancMdl', { HOUSE_MANAGE_NO: hno });
      await sleep(100);
      if (!types?.length) continue;

      const unitTypes = types.map(t => {
        const parsed = parseHouseTy(t.HOUSE_TY ?? '');
        if (!parsed) return null;
        const supply = parseFloat(t.SUPLY_AR ?? t.suply_ar ?? 0) || 0;
        const count  = parseInt(t.SUPLY_HSHLDCO ?? t.suply_hshldco ?? 0) || 0;
        const letter = parsed.letter;
        return {
          house_ty:         `${parsed.exclusive_area}${letter}`,
          exclusive_area:   parsed.exclusive_area,
          exclusive_pyeong: Math.round(parsed.exclusive_area / 3.3),
          supply_area:      supply > 0 ? Math.round(supply * 100) / 100 : null,
          supply_pyeong:    supply > 0 ? Math.round(supply / 3.3) : null,
          count,
          source:           'cheongak',
        };
      }).filter(Boolean);

      if (unitTypes.length) return unitTypes;
    }
    await sleep(80);
  }
  return null;
}

// ── apt_trades 자동 생성 ──────────────────────────────────────────────────────
async function fetchFromTrades(kaptCode) {
  const { data: complex } = await supabase
    .from('apartment_complexes')
    .select('molit_key')
    .eq('kapt_code', kaptCode)
    .maybeSingle();
  if (!complex?.molit_key) return null;

  const [lawdCd, aptName] = complex.molit_key.split('|');
  const { data } = await supabase
    .from('apt_trades')
    .select('exclusive_area')
    .eq('lawd_cd', lawdCd)
    .eq('apt_name', aptName)
    .eq('deal_type', 'T')
    .not('exclusive_area', 'is', null);
  if (!data?.length) return null;

  const counts = new Map();
  for (const r of data) {
    const area = Math.round(parseFloat(r.exclusive_area) * 100) / 100;
    counts.set(area, (counts.get(area) ?? 0) + 1);
  }
  const areas = [...counts.entries()].filter(([, c]) => c >= 2).sort(([a], [b]) => a - b);
  if (!areas.length) return null;

  const buckets = new Map();
  for (const [area] of areas) {
    const k = Math.floor(area);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(area);
  }

  return areas.map(([area, count]) => {
    const bucket = buckets.get(Math.floor(area)) ?? [area];
    const idx    = bucket.indexOf(area);
    const letter = bucket.length > 1 ? String.fromCharCode(65 + idx) : '';
    const est    = Math.round(area * 1.3 * 100) / 100;
    return {
      house_ty:         `${Math.floor(area)}${letter}`,
      exclusive_area:   area,
      exclusive_pyeong: Math.round(area / 3.3),
      supply_area:      est,
      supply_pyeong:    Math.round(est / 3.3),
      count,
      source:           'molit',
    };
  });
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`🔧 수동 입력 대상 ${TARGETS.length}개 보강 시작`);
  console.log(`   청약홈: ${API_KEY ? '✅' : '❌ API_KEY 없음'} | dry-run: ${dryRun}\n`);

  // 이미 source=manual인 단지 확인
  const { data: existing } = await supabase
    .from('apartment_complexes')
    .select('kapt_code, unit_types')
    .in('kapt_code', TARGETS.map(t => t.kapt_code));

  const manualDone = new Set(
    (existing ?? [])
      .filter(r => Array.isArray(r.unit_types) && r.unit_types.some(u => u.source === 'manual'))
      .map(r => r.kapt_code)
  );
  console.log(`   이미 수동 입력 완료: ${manualDone.size}개 (스킵)\n`);

  const now = new Date().toISOString();
  const results = { cheongak: [], trades: [], needManual: [] };

  for (const t of TARGETS) {
    if (manualDone.has(t.kapt_code)) {
      console.log(`  ✅ [스킵] ${t.name} — source=manual 존재`);
      continue;
    }

    process.stdout.write(`  🔍 ${t.name} (${t.kapt_code})... `);

    // 1) 청약홈 시도
    let unitTypes = await fetchCheongakTypes(t.name, t.sigungu);
    let source = 'cheongak';

    // 2) 청약홈 실패 → apt_trades
    if (!unitTypes) {
      unitTypes = await fetchFromTrades(t.kapt_code);
      source = 'trades';
    }

    if (!unitTypes) {
      console.log('❌ 데이터 없음 → 수동 필요');
      results.needManual.push(t);
      continue;
    }

    console.log(`${source === 'cheongak' ? '청약홈' : 'apt_trades'} ${unitTypes.length}타입`);
    if (source === 'cheongak') results.cheongak.push(t.name);
    else results.trades.push(t.name);

    if (!dryRun) {
      const { error } = await supabase
        .from('apartment_complexes')
        .update({ unit_types: unitTypes, updated_at: now })
        .eq('kapt_code', t.kapt_code);
      if (error) console.error(`    ⚠️ DB 오류: ${error.message}`);
    } else {
      console.log('    [dry-run] 저장 스킵');
    }

    await sleep(200);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ 청약홈 자동 완료: ${results.cheongak.length}개`);
  if (results.cheongak.length) console.log('   ' + results.cheongak.join(', '));
  console.log(`✅ apt_trades 자동 완료: ${results.trades.length}개`);
  if (results.trades.length) console.log('   ' + results.trades.join(', '));

  if (results.needManual.length) {
    console.log(`\n⚠️  수동 입력 필요: ${results.needManual.length}개`);
    console.log('   네이버부동산에서 평형 정보 확인 후 Supabase 직접 입력\n');
    for (const t of results.needManual) {
      console.log(`   ${t.kapt_code}  ${t.name} (${t.sido} ${t.sigungu})`);
    }
  } else {
    console.log('\n🎉 전부 자동 완료!');
  }
}

main().catch(e => { console.error('❌', e); process.exit(1); });
