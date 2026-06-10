/**
 * LG메트로시티아파트 (A60809004) 차수 분리
 * K-apt 합산 7,374세대 → 7개 차수 M-prefix 단지로 분리
 */
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SIDO_SHORT = { '부산광역시': '부산' };

function molitKaptCode(lawdCd, aptName) {
  const h = createHash('md5').update(`${lawdCd}|${aptName}`).digest('hex').slice(0, 8);
  return 'M' + h.toUpperCase();
}

function makeSlug(sido, sigungu, name, kaptCode) {
  const sidoShort = SIDO_SHORT[sido] ?? sido;
  const base = [sidoShort, sigungu, name].join('-').replace(/\s+/g, '-').replace(/[^\w가-힣-]/g, '');
  return `${base}-${kaptCode.toLowerCase()}`;
}

// 스크린샷 기준 7개 차수 정보
const COMPLEXES = [
  { apt_name: '엘지메트로시티1',           road_addr: '부산광역시 남구 부포로 111' },
  { apt_name: '엘지메트로시티2',           road_addr: '부산광역시 남구 부포로 111' },
  { apt_name: '엘지메트로시티3',           road_addr: '부산광역시 남구 부포로 111' },
  { apt_name: '엘지메트로시티4-1(201-214)',  road_addr: '부산광역시 남구 부포로 113' },
  { apt_name: '엘지메트로시티4-2(215~220동)', road_addr: '부산광역시 남구 부포로 113' },
  { apt_name: '엘지메트로시티4-2(230~238)',  road_addr: '부산광역시 남구 부포로 113' },
  { apt_name: '엘지메트로시티5',           road_addr: '부산광역시 남구 부포로 113' },
];

const BASE = {
  lawd_cd:    '26290',
  sido:       '부산',
  sigungu:    '남구',
  dong:       '용호동',
  lat:        35.1281521367661,
  lng:        129.113295525202,
  built_year: 2001,
  kapt_addr:  '부산광역시 남구 용호동 176-30',
  source:     'molit',
};

async function run() {
  console.log('▶ LG메트로시티 차수 분리 시작\n');

  // 0) 합산 단지 molit_key 먼저 해제 (unique constraint 충돌 방지)
  const { error: clearErr } = await sb.from('apartment_complexes')
    .update({ molit_key: null, source: 'kapt_deprecated' })
    .eq('kapt_code', 'A60809004');
  if (clearErr) { console.error('molit_key 해제 실패:', clearErr.message); process.exit(1); }
  console.log('✅ 합산 단지 A60809004 molit_key 해제\n');

  // 1) 7개 차수 upsert
  const inserts = COMPLEXES.map(({ apt_name, road_addr }) => {
    const kaptCode = molitKaptCode(BASE.lawd_cd, apt_name);
    return {
      kapt_code:    kaptCode,
      molit_key:    `${BASE.lawd_cd}|${apt_name}`,
      name:         apt_name,
      slug:         makeSlug('부산광역시', BASE.sigungu, apt_name, kaptCode),
      sido:         BASE.sido,
      sigungu:      BASE.sigungu,
      dong:         BASE.dong,
      lat:          BASE.lat,
      lng:          BASE.lng,
      built_year:   BASE.built_year,
      kapt_addr:    BASE.kapt_addr,
      road_address: road_addr,
      source:       BASE.source,
    };
  });

  const { error: insErr } = await sb.from('apartment_complexes')
    .upsert(inserts, { onConflict: 'kapt_code' });
  if (insErr) { console.error('INSERT 실패:', insErr.message); process.exit(1); }
  console.log(`✅ 7개 차수 단지 생성 완료`);
  inserts.forEach(r => console.log(`   ${r.kapt_code}  ${r.name}  ${r.road_address}`));

  console.log('\n✅ 합산 단지 A60809004 → source=kapt_deprecated (지도 제외 처리)');

  // 3) 7개 차수 avg_price 확인
  console.log('\n📊 차수별 거래 현황:');
  for (const { apt_name } of COMPLEXES) {
    const { count } = await sb.from('apt_trades').select('*', { count: 'exact', head: true })
      .eq('apt_name', apt_name).in('deal_type', ['T', 'J']);
    console.log(`   ${apt_name}: ${count ?? 0}건`);
  }

  console.log('\n🎉 완료! enrich-prices --lawd=26290 로 평균가 재계산 권장');
}

run().catch(console.error);
