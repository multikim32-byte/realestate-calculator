/**
 * 청약홈 API → unit_types 보강 스크립트
 *
 * 2020년 이후 분양 단지에 대해:
 * 1) getAPTLttotPblancDetail (단지명 LIKE 검색) → house_manage_no
 * 2) getAPTLttotPblancMdl (주택형 상세) → house_ty, suply_ar, exclusive_area, count
 * 3) unit_types 업데이트 (source: 'cheongak')
 *
 * house_ty 파싱: "059.9400A" → exclusive_area=59.94, letter="A"
 *                "084.9840 " → exclusive_area=84.984, letter="" (단일 타입)
 *
 * 실행: node scripts/enrich-cheongak.mjs
 * 옵션:
 *   --dry-run       DB 업데이트 없이 매칭 결과만 출력
 *   --test          첫 20개 단지만 처리 + 상세 로그
 *   --kapt=XXXXX    특정 단지 1개만 처리
 *   --from=N        N번째 단지부터 재개 (중단 후 재시작용)
 *   --year=YYYY     built_year >= YYYY (기본: 2020)
 *
 * 필수 env: CHEONGAK_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { setTimeout as sleep } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const API_KEY  = (process.env.PUBLIC_DATA_API_KEY ?? process.env.CHEONGAK_API_KEY)?.trim();
const SB_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SB_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!API_KEY || !SB_URL || !SB_KEY) {
  console.error('❌ 필수 환경변수 없음 (PUBLIC_DATA_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const BASE = 'https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1';

const dryRun  = process.argv.includes('--dry-run');
const testMode = process.argv.includes('--test');
const presaleMode = process.argv.includes('--presale'); // 분양권 거래 있는 built_year null 단지 보강
const kaptArg = process.argv.find(a => a.startsWith('--kapt='))?.replace('--kapt=', '');
const fromArg = parseInt(process.argv.find(a => a.startsWith('--from='))?.replace('--from=', '') || '0');
const yearArg = parseInt(process.argv.find(a => a.startsWith('--year='))?.replace('--year=', '') || '2020');

const supabase = createClient(SB_URL, SB_KEY);

// 분양권(N) 거래 있는 단지키 수집 (lawd_cd별 분할 — deal_type 단독 필터는 statement timeout)
async function loadPresaleKeys() {
  const { LAWD_CODE_MAP } = await import('./lawd-codes.mjs');
  const lawds = [];
  for (const list of Object.values(LAWD_CODE_MAP)) for (const d of list) lawds.push(d.code);
  const keys = new Set();
  for (const lawd of lawds) {
    let lastId = 0;
    while (true) { // 페이징 (1000건 초과 lawd에서 단지명 누락 방지 — 양주 등)
      const { data } = await supabase.from('apt_trades').select('id, apt_name')
        .eq('lawd_cd', lawd).eq('deal_type', 'N').gt('id', lastId).order('id').limit(1000);
      if (!data?.length) break;
      for (const r of data) keys.add(`${lawd}|${r.apt_name}`);
      lastId = data[data.length - 1].id;
      if (data.length < 1000) break;
    }
  }
  return keys;
}

// ── house_ty 파싱 ──────────────────────────────────────────────────────────────
// 예: "059.9400A" → { exclusive_area: 59.94, letter: "A" }
// 예: "084.9840 " → { exclusive_area: 84.984, letter: "" }
function parseHouseTy(raw) {
  if (!raw) return null;
  const s = raw.trim();
  const match = s.match(/^(\d{3})\.(\d+)([A-Z]?)$/);
  if (!match) return null;
  const area = parseFloat(`${match[1]}.${match[2]}`);
  const letter = match[3] ?? '';
  return { exclusive_area: area, letter };
}

// ── 청약홈 API fetch 헬퍼 ─────────────────────────────────────────────────────
async function cheongakFetch(endpoint, params) {
  const qs = new URLSearchParams({ serviceKey: API_KEY, page: '1', perPage: '100', ...params });
  const url = `${BASE}/${endpoint}?${qs.toString()}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

// 아파트 브랜드 목록 (검색 시 prefix 제거용)
const BRANDS = [
  '힐스테이트', '래미안', '자이', '아이파크', '푸르지오', '롯데캐슬',
  '한화포레나', '포레나', '디에이치', '아크로', '르엘', '이편한세상',
  '더샵', '리첸시아', '센트레빌', '에피트', '쌍용더플래티넘', '제일풍경채',
  '두산위브', '우미린', '효성해링턴', '금호어울림', '한신더휴', '호반써밋',
  'e편한세상', 'e-편한세상',
];

// ── Step 1: 단지명으로 house_manage_no 검색 ────────────────────────────────────
async function findHouseManageNo(name, sigungu, sido) {
  const cleaned = name.trim();
  if (!cleaned) return [];

  // 공통 접미사/불필요 단어 제거
  const stripped = cleaned
    .replace(/아파트$/, '').replace(/\d+단지$/, '').replace(/단지$/, '')
    .replace(/주상복합$/, '').replace(/오피스텔$/, '')
    .replace(/임대$/, '').trim();

  // 브랜드명 제거 → 핵심 지역/고유명만 추출
  let coreName = stripped;
  for (const brand of BRANDS) {
    if (stripped.includes(brand)) {
      const after = stripped.replace(brand, '').replace(/^\s+/, '').trim();
      if (after.length >= 3) { coreName = after; break; }
    }
  }

  // 검색 키워드 우선순위: 전체명, 핵심명, 핵심명 앞 4자, 핵심명 뒤 4자
  const candidates = new Set([
    stripped,
    coreName,
    coreName.length > 4 ? coreName.slice(0, 4) : null,
    coreName.length > 4 ? coreName.slice(-5) : null,
  ].filter(Boolean));

  for (const kw of candidates) {
    if (kw.length < 3) continue;
    const result = await trySearch(kw, name, sigungu, sido);
    if (result.length) return result;
    await sleep(80);
  }

  return [];
}

async function trySearch(keyword, ourName, sigungu, sido) {
  const data = await cheongakFetch('getAPTLttotPblancDetail', {
    'cond[HOUSE_NM::LIKE]': keyword,
  });
  if (!data?.length) return [];
  return filterByLocation(data, ourName, sigungu, sido);
}

// 단지 번호 추출: "1단지" → 1, "2BL" → 2, 없으면 null
function extractComplexNo(name) {
  const m = name.match(/(\d+)단지/) ?? name.match(/(\d+)BL\b/i) ?? name.match(/(\d+)블록/);
  return m ? parseInt(m[1]) : null;
}

// 공백 제거 후 3-gram 집합 생성
function trigrams(s) {
  const n = s.replace(/\s+/g, '');
  const t = new Set();
  for (let i = 0; i < n.length - 2; i++) t.add(n.slice(i, i + 3));
  return t;
}

function trigramDice(a, b) {
  const ta = trigrams(a), tb = trigrams(b);
  if (!ta.size && !tb.size) return 1;
  let shared = 0;
  for (const g of ta) if (tb.has(g)) shared++;
  return (2 * shared) / (ta.size + tb.size);
}

// 시도 축약형 → 주소에 나타날 수 있는 별칭 (충북 ≠ 충청북도 부분문자열이라 별도 매핑 필요)
const SIDO_ALIASES = {
  '서울': ['서울'], '부산': ['부산'], '대구': ['대구'], '인천': ['인천'],
  '광주': ['광주'], '대전': ['대전'], '울산': ['울산'], '세종': ['세종'],
  '경기': ['경기'], '강원': ['강원'], '충북': ['충북', '충청북'], '충남': ['충남', '충청남'],
  '전북': ['전북', '전라북'], '전남': ['전남', '전라남'], '경북': ['경북', '경상북'],
  '경남': ['경남', '경상남'], '제주': ['제주'],
};

function filterByLocation(records, ourName, sigungu, sido) {
  const ourNo = extractComplexNo(ourName);
  const sidoAliases = SIDO_ALIASES[sido] ?? (sido ? [sido] : []);
  // 시군구 토큰 (복합 "포항 남구" → ["포항","남구"]), 시/군/구 접미사 제거형도 허용
  const sgTokens = (sigungu ?? '').split(/\s+/).filter(t => t.length >= 2);

  return records.filter(r => {
    const theirName = r.HOUSE_NM ?? '';
    const theirAddr = r.HSSPLY_ADRES ?? '';

    // 단지 번호 불일치 → 제외
    if (ourNo !== null) {
      const theirNo = extractComplexNo(theirName);
      if (theirNo !== null && theirNo !== ourNo) return false;
    }

    // 시도 검증 (광역 오매칭 방지: 영종(인천) → 목동(서울) 차단)
    if (sidoAliases.length && theirAddr && !sidoAliases.some(a => theirAddr.includes(a))) return false;

    // 시군구 검증 (모든 토큰이 주소에 있어야 — "중구" 같은 2글자도 검증)
    if (sgTokens.length && theirAddr) {
      const ok = sgTokens.every(t =>
        theirAddr.includes(t) || theirAddr.includes(t.replace(/[시군구]$/, '')));
      if (!ok) return false;
    }

    // trigram Dice ≥ 0.45 이면 매칭
    const score = trigramDice(ourName, theirName);
    return score >= 0.45;
  });
}

// ── Step 2: house_manage_no로 주택형 조회 ─────────────────────────────────────
async function fetchMdlTypes(houseManageNo) {
  const data = await cheongakFetch('getAPTLttotPblancMdl', {
    'cond[HOUSE_MANAGE_NO::EQ]': String(houseManageNo),
  });
  return data ?? [];
}

// ── mdl 레코드 → unit_type 변환 ───────────────────────────────────────────────
function parseMdlRecord(r) {
  const parsed = parseHouseTy(r.HOUSE_TY);
  if (!parsed) return null;

  const { exclusive_area, letter } = parsed;
  const suplyAr = parseFloat(r.SUPLY_AR ?? 0);
  const count = parseInt(r.SUPLY_HSHLDCO ?? 0) + parseInt(r.SPSPLY_HSHLDCO ?? 0);

  if (exclusive_area <= 0 || suplyAr <= 0) return null;

  const exclusivePy = Math.round(exclusive_area / 3.3);
  const supplyPy    = Math.round(suplyAr / 3.3);

  // house_ty 코드: 기존 형식("26평A")과 동일하게 생성
  const houseTy = `${exclusivePy}평${letter}`;

  return {
    house_ty:         houseTy,
    exclusive_area:   Math.round(exclusive_area * 100) / 100,
    supply_area:      Math.round(suplyAr * 100) / 100,
    exclusive_pyeong: exclusivePy,
    supply_pyeong:    supplyPy,
    count:            count > 0 ? count : null,
    source:           'cheongak',
    official_ty:      `${Math.round(exclusive_area * 100) / 100}${letter}`,
  };
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
async function main() {
  const SEL = 'kapt_code, name, sido, sigungu, dong, built_year, unit_types, molit_key, move_in_ym';
  console.log(`🏗️  청약홈 unit_types 보강 시작 (${presaleMode ? '분양권 미보강 단지' : `built_year >= ${yearArg}`})`);
  console.log(`   dry-run: ${dryRun} | test: ${testMode}\n`);

  const complexes = [];
  if (kaptArg) {
    const { data } = await supabase.from('apartment_complexes').select(SEL).eq('kapt_code', kaptArg);
    complexes.push(...(data ?? []));
  } else if (presaleMode) {
    // 분양권(N) 거래 있고 미보강(built_year null 또는 청약홈 unit_types 없음)인 active 단지
    process.stdout.write('  분양권 거래키 수집 중...');
    const nKeys = await loadPresaleKeys();
    console.log(` ${nKeys.size}개`);
    let from = 0;
    while (true) {
      const { data } = await supabase.from('apartment_complexes')
        .select(SEL).neq('source', 'kapt_deprecated').order('kapt_code').range(from, from + 999);
      if (!data?.length) break;
      for (const c of data) {
        if (!c.molit_key || !nKeys.has(c.molit_key)) continue;
        const hasCheongak = Array.isArray(c.unit_types) && c.unit_types.some(t => t.source === 'cheongak');
        if (!c.built_year || !hasCheongak || !c.move_in_ym) complexes.push(c);
      }
      if (data.length < 1000) break;
      from += 1000;
    }
  } else {
    let from = 0;
    while (true) {
      const { data, error } = await supabase.from('apartment_complexes')
        .select(SEL).gte('built_year', yearArg).order('kapt_code').range(from, from + 999);
      if (error || !data?.length) break;
      complexes.push(...data);
      if (data.length < 1000) break;
      from += 1000;
    }
  }

  const targets = complexes.slice(fromArg, testMode ? fromArg + 20 : undefined);
  console.log(`🏢 대상: ${targets.length.toLocaleString()}개 (${fromArg}번째부터)\n`);
  if (!targets.length) { console.log('✅ 처리할 단지 없음'); return; }

  let done = 0, matched = 0, updated = 0, noMatch = 0, fail = 0;
  const now = new Date().toISOString();

  for (const c of targets) {
    done++;

    // 청약홈에서 단지 검색 (표시명 → 실패 시 molit_key 신고명으로 재검색)
    // 개명 단지(에피트←한라비발디)·띄어쓰기 차이는 molit 신고명이 청약홈과 일치
    let matches = await findHouseManageNo(c.name, c.sigungu, c.sido);
    const molitName = c.molit_key?.split('|')[1];
    if (!matches.length && molitName && molitName !== c.name) {
      await sleep(100);
      matches = await findHouseManageNo(molitName, c.sigungu, c.sido);
    }
    await sleep(100);

    if (!matches.length) {
      noMatch++;
      if (testMode) console.log(`[미매칭] ${c.name} (${c.kapt_code})`);
      if (!testMode) process.stdout.write(`\r  ${done}/${targets.length} | 매칭: ${matched} | 미매칭: ${noMatch} | 실패: ${fail}   `);
      continue;
    }

    // 여러 매칭 중 최신 공고 사용 (RCRIT_PBLANC_DE 내림차순)
    const best = matches.sort((a, b) =>
      (b.RCRIT_PBLANC_DE ?? b.RCEPT_BGNDE ?? '').localeCompare(a.RCRIT_PBLANC_DE ?? a.RCEPT_BGNDE ?? '')
    )[0];

    const houseManageNo = best.HOUSE_MANAGE_NO;
    if (!houseManageNo) { noMatch++; continue; }

    // 주택형 상세 조회
    const mdlRows = await fetchMdlTypes(houseManageNo);
    await sleep(100);

    if (!mdlRows.length) {
      noMatch++;
      if (testMode) console.log(`[주택형 없음] ${c.name} → ${best.HOUSE_NM}`);
      continue;
    }

    const unitTypes = mdlRows
      .map(parseMdlRecord)
      .filter(Boolean)
      .sort((a, b) => a.exclusive_area - b.exclusive_area || a.house_ty.localeCompare(b.house_ty));

    if (!unitTypes.length) { noMatch++; continue; }

    matched++;

    if (testMode || dryRun) {
      const pDate = best.RCRIT_PBLANC_DE ?? best.RCEPT_BGNDE ?? '-';
      console.log(`\n[매칭] ${c.name} → "${best.HOUSE_NM}" (${pDate})`);
      unitTypes.forEach(u =>
        console.log(`  ${u.house_ty.padEnd(8)} | 전용 ${String(u.exclusive_area).padStart(6)}㎡ | 공급 ${String(u.supply_area).padStart(7)}㎡ | ${u.count ?? '?'}세대`)
      );
    }

    // 분양 정보: 입주예정월·당첨발표일 (있으면 항상 저장), 분양 세대수·입주예정연도(built_year 비어있을 때)
    const payload = { unit_types: unitTypes, updated_at: now };
    const moveInYm = best.MVN_PREARNGE_YM ? String(best.MVN_PREARNGE_YM) : null;
    const winnerDate = best.PRZWNER_PRESNATN_DE || null;
    if (moveInYm) payload.move_in_ym = moveInYm;
    if (winnerDate) payload.winner_date = winnerDate;
    // 분양권 단지는 입주예정연도가 준공/입주 기준 — presale 모드면 stale built_year 덮어씀
    if (moveInYm && (presaleMode || !c.built_year)) {
      payload.built_year = parseInt(moveInYm.slice(0, 4));
    }
    if (presaleMode && !c.total_units) {
      const totalUnits = unitTypes.reduce((s, u) => s + (u.count ?? 0), 0) || null;
      if (totalUnits) payload.total_units = totalUnits;
    }

    if (!dryRun) {
      const { error } = await supabase
        .from('apartment_complexes')
        .update(payload)
        .eq('kapt_code', c.kapt_code);

      if (error) {
        console.error(`\n⚠️  DB 오류 [${c.name}]: ${error.message}`);
        fail++;
      } else {
        updated++;
      }
    }

    if (!testMode) process.stdout.write(`\r  ${done}/${targets.length} | 매칭: ${matched} | 미매칭: ${noMatch} | 실패: ${fail}   `);

    await sleep(150);
    if (done % 100 === 0) await sleep(800);
  }

  console.log(`\n\n🎉 완료!`);
  console.log(`   매칭 성공: ${matched.toLocaleString()}`);
  console.log(`   DB 업데이트: ${updated.toLocaleString()}`);
  console.log(`   미매칭: ${noMatch.toLocaleString()}`);
  console.log(`   실패: ${fail.toLocaleString()}`);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
