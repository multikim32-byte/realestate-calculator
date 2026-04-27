import GlobalNav from '@/app/components/GlobalNav';
import { supabase } from '@/lib/supabase';
import { LAWD_CODE_MAP } from '@/lib/tradeApi';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

const REGION_LABELS: Record<string, string> = {
  '서울': '서울특별시', '경기': '경기도', '인천': '인천광역시',
  '부산': '부산광역시', '대구': '대구광역시', '광주': '광주광역시',
  '대전': '대전광역시', '울산': '울산광역시', '세종': '세종특별자치시',
  '강원': '강원도', '충북': '충청북도', '충남': '충청남도',
  '전북': '전라북도', '전남': '전라남도', '경북': '경상북도',
  '경남': '경상남도', '제주': '제주특별자치도',
};

type RegionInfo = { intro: string; features: string[]; hotAreas: string[]; avgPrice: string; faq: { q: string; a: string }[] };

const REGION_INFO: Record<string, RegionInfo> = {
  '서울': {
    intro: '서울특별시는 대한민국 최대 부동산 시장으로 강남·강북·도심권 등 권역별로 다양한 청약 단지가 공급됩니다. 재건축·재개발 사업이 활발하며 분양가 상한제 적용으로 시세 대비 저렴한 분양가가 경쟁률을 높입니다.',
    features: ['재건축·재개발 사업 활발', '청약 경쟁률 전국 최고 수준', '분양가 상한제 적용 지역 다수', '강남·서초·송파 등 고가 주거지역 형성'],
    hotAreas: ['강남구', '서초구', '마포구', '송파구', '용산구', '성동구'],
    avgPrice: '10억~30억원대 (전용 84㎡ 기준)',
    faq: [
      { q: '서울 청약 1순위 조건은?', a: '서울 거주 2년 이상, 청약통장 가입 2년 이상, 납입횟수 24회 이상이 기본 조건입니다. 투기과열지구 지정 지역은 세대주·무주택 조건이 추가됩니다.' },
      { q: '서울 청약 가점 커트라인은?', a: '강남·서초·송파권은 70점대 이상, 비강남권은 50~65점대가 일반적입니다. 단지·면적에 따라 크게 차이납니다.' },
    ],
  },
  '경기': {
    intro: '경기도는 서울 인접 수도권으로 GTX 개통 호재와 함께 부동산 시장이 활성화되고 있습니다. 수원·고양·화성·용인 등 대규모 택지지구 청약이 많고 서울 대비 합리적인 분양가로 수요가 높습니다.',
    features: ['GTX-A·B·C 노선 개발 호재', '신도시·택지지구 대규모 공급', '서울 대비 합리적인 분양가', '3기 신도시(남양주왕숙·하남교산·고양창릉 등) 공급'],
    hotAreas: ['수원', '화성', '고양', '용인', '하남', '남양주', '평택'],
    avgPrice: '4억~12억원대 (전용 84㎡ 기준)',
    faq: [
      { q: '경기도 청약 1순위 조건은?', a: '경기도 거주 또는 수도권 거주, 청약통장 가입 1년 이상, 납입횟수 12회 이상이 기본 조건입니다. 투기과열지구는 2년 이상 조건이 적용됩니다.' },
      { q: '경기도 인기 청약 지역은?', a: 'GTX 개통 예정인 화성동탄, 수원영통, 하남교산 신도시 등이 인기입니다. 3기 신도시도 장기적 가치가 높습니다.' },
    ],
  },
  '인천': {
    intro: '인천광역시는 송도국제도시·청라국제도시·영종하늘도시 등 경제자유구역 개발로 신규 공급이 활발합니다. 수도권 접근성과 함께 상대적으로 낮은 분양가로 실수요자 관심이 높습니다.',
    features: ['송도·청라·영종 경제자유구역 개발', '수도권 전철망 확충', '서울 대비 저렴한 분양가', '인천대교·제2경인고속도로 교통 인프라'],
    hotAreas: ['연수구(송도)', '서구(청라)', '중구(영종)', '남동구', '부평구'],
    avgPrice: '3억~8억원대 (전용 84㎡ 기준)',
    faq: [
      { q: '인천 청약 1순위 조건은?', a: '인천 거주 또는 수도권 거주, 청약통장 가입 1년 이상, 납입횟수 12회 이상입니다. 경제자유구역 단지는 별도 조건이 적용될 수 있습니다.' },
      { q: '인천 송도 청약 경쟁률은?', a: '송도는 입지와 브랜드에 따라 수십 대 1 경쟁률을 기록합니다. 청라·영종은 상대적으로 낮은 편입니다.' },
    ],
  },
  '부산': {
    intro: '부산광역시는 대한민국 제2의 도시로 해운대·수영·동래 등 주거 선호 지역을 중심으로 청약 수요가 꾸준합니다. 북항재개발·에코델타시티 등 대규모 개발사업이 진행 중입니다.',
    features: ['해운대·수영구 프리미엄 주거 입지', '북항재개발 및 에코델타시티 개발', '부산 도심 재건축·재개발 활발', '가덕도 신공항 개발 호재'],
    hotAreas: ['해운대구', '수영구', '동래구', '연제구', '부산진구'],
    avgPrice: '4억~15억원대 (전용 84㎡ 기준)',
    faq: [
      { q: '부산 청약 1순위 조건은?', a: '부산 거주 또는 경남권 거주, 청약통장 가입 1년 이상, 납입횟수 12회 이상입니다. 해운대 등 투기과열지구는 강화된 조건이 적용됩니다.' },
      { q: '부산 인기 청약 지역은?', a: '해운대 엘시티 인근, 수영구 민락동, 동래구 온천동 등이 선호됩니다. 에코델타시티는 장기 투자 관점에서 주목받습니다.' },
    ],
  },
  '대구': {
    intro: '대구광역시는 수성구를 중심으로 교육·주거 프리미엄 지역이 형성돼 있습니다. 최근 입주 물량 증가로 가격 조정이 있었으나 범어·만촌동 등 선호 지역은 꾸준한 수요를 보입니다.',
    features: ['수성구 학군 프리미엄', '대구경북신공항 이전 개발 호재', '달서구·북구 대규모 택지 개발', '지하철 1·2·3호선 교통망'],
    hotAreas: ['수성구', '달서구', '북구', '동구', '중구'],
    avgPrice: '3억~8억원대 (전용 84㎡ 기준)',
    faq: [
      { q: '대구 청약 1순위 조건은?', a: '대구 거주 또는 대구·경북 거주, 청약통장 가입 1년 이상, 납입횟수 12회 이상입니다.' },
      { q: '대구 수성구 청약은 어렵나요?', a: '수성구는 학군 수요로 경쟁률이 높습니다. 범어·만촌동 신규 단지는 수십 대 1 경쟁률을 기록하는 경우가 많습니다.' },
    ],
  },
  '광주': {
    intro: '광주광역시는 첨단지구·수완지구 등 신개발지를 중심으로 아파트 공급이 이루어지고 있습니다. 전국 대비 합리적인 분양가로 실수요자 중심의 안정적인 시장을 형성하고 있습니다.',
    features: ['첨단·수완·운남 택지지구 개발', '광주-대구 달빛철도 개발 호재', '합리적인 분양가', '인근 나주혁신도시와 연계'],
    hotAreas: ['서구(수완)', '광산구(첨단)', '남구', '북구', '동구'],
    avgPrice: '2.5억~6억원대 (전용 84㎡ 기준)',
    faq: [
      { q: '광주 청약 1순위 조건은?', a: '광주 거주 또는 전남·전북 거주, 청약통장 가입 6개월 이상, 납입횟수 6회 이상입니다.' },
      { q: '광주 인기 청약 지역은?', a: '첨단지구(광산구)와 수완지구(서구)가 선호됩니다. 교통·학군·편의시설이 잘 갖춰진 신도심 지역입니다.' },
    ],
  },
  '대전': {
    intro: '대전광역시는 둔산신도시를 중심으로 고급 주거지가 형성돼 있으며, 도안신도시 등 신규 택지지구 개발이 활발합니다. 세종시와 인접해 행정도시 배후 수요도 있습니다.',
    features: ['둔산신도시 고급 주거지 형성', '도안신도시 신규 공급', '세종시 인접 행정도시 배후 수요', 'KTX 역세권 개발'],
    hotAreas: ['서구(둔산)', '유성구(도안)', '중구', '동구', '대덕구'],
    avgPrice: '3억~7억원대 (전용 84㎡ 기준)',
    faq: [
      { q: '대전 청약 1순위 조건은?', a: '대전 거주 또는 충남·세종 거주, 청약통장 가입 1년 이상, 납입횟수 12회 이상입니다.' },
      { q: '대전 도안신도시 청약 전망은?', a: '도안신도시는 계획적인 도시 개발로 편의시설이 잘 갖춰져 있어 실수요자 선호도가 높습니다. 분양가 대비 시세 프리미엄이 형성됩니다.' },
    ],
  },
  '울산': {
    intro: '울산광역시는 현대자동차·현대중공업 등 대기업 근로자 수요를 바탕으로 안정적인 주거 수요가 유지됩니다. 남구 삼산동을 중심으로 주거 선호 지역이 형성돼 있습니다.',
    features: ['대기업 산업단지 배후 주거 수요', '남구 삼산 도심 생활권', 'KTX 울산역 역세권 개발', '동천지구 등 신규 택지 개발'],
    hotAreas: ['남구(삼산)', '북구', '중구', '동구', '울주군'],
    avgPrice: '2.5억~6억원대 (전용 84㎡ 기준)',
    faq: [
      { q: '울산 청약 1순위 조건은?', a: '울산 거주 또는 경남·부산 거주, 청약통장 가입 1년 이상, 납입횟수 12회 이상입니다.' },
      { q: '울산 분양 시장 전망은?', a: '산업 구조 변화로 변동성이 있으나, 삼산·달동 등 선호 지역 신규 단지는 안정적인 수요를 보입니다.' },
    ],
  },
  '세종': {
    intro: '세종특별자치시는 행정수도 이전으로 공무원·공기업 종사자 수요가 집중된 특수 시장입니다. BRT 교통망과 스마트시티 개발로 지속적인 성장이 예상됩니다.',
    features: ['행정수도 공무원·공기업 주거 수요', 'BRT 간선교통 체계', '스마트시티 국가시범도시 개발', '교육·의료·문화시설 계획도시 인프라'],
    hotAreas: ['한솔동', '도담동', '고운동', '아름동', '조치원읍'],
    avgPrice: '3.5억~8억원대 (전용 84㎡ 기준)',
    faq: [
      { q: '세종 청약 1순위 조건은?', a: '세종 거주 또는 충남·충북·대전 거주, 청약통장 가입 1년 이상, 납입횟수 12회 이상입니다. 실거주 의무가 강화된 경우가 있습니다.' },
      { q: '세종 분양 당첨 후 실거주 의무가 있나요?', a: '투기과열지구 지정 시 전매제한 및 실거주 의무가 부여됩니다. 단지별로 조건이 다르므로 분양공고문 확인이 필수입니다.' },
    ],
  },
  '강원': {
    intro: '강원도는 춘천·원주·강릉을 중심으로 실수요 청약 시장이 형성돼 있습니다. 전국 대비 낮은 분양가와 수려한 자연환경으로 은퇴 주거 수요도 증가하고 있습니다.',
    features: ['전국 대비 저렴한 분양가', '춘천·원주 역세권 개발', '강릉·속초 관광·레저 주거 수요', 'GTX-B 춘천 연장 검토'],
    hotAreas: ['춘천시', '원주시', '강릉시', '홍천군', '횡성군'],
    avgPrice: '1.5억~4억원대 (전용 84㎡ 기준)',
    faq: [
      { q: '강원도 청약 1순위 조건은?', a: '강원도 거주, 청약통장 가입 6개월 이상, 납입횟수 6회 이상입니다. 비수도권 지역은 조건이 완화돼 있습니다.' },
      { q: '강원도 청약 경쟁률은 낮은가요?', a: '춘천·원주 도심 단지는 경쟁률이 있으나, 군 지역은 미달이 발생하는 경우도 있습니다. 접근성·브랜드·분양가가 핵심 변수입니다.' },
    ],
  },
  '충북': {
    intro: '충청북도는 청주시를 중심으로 주거 수요가 집중됩니다. 청주 오창·오송 첨단산업단지와 바이오산업클러스터 발전으로 기업 종사자 수요가 늘고 있습니다.',
    features: ['청주 오창·오송 첨단산업단지', '바이오헬스 클러스터 개발', 'KTX 오송역 역세권', '세종·대전 생활권 접근성'],
    hotAreas: ['청주시 흥덕구', '청주시 서원구', '음성군', '충주시', '제천시'],
    avgPrice: '2억~5억원대 (전용 84㎡ 기준)',
    faq: [
      { q: '충북 청약 1순위 조건은?', a: '충북 거주, 청약통장 가입 6개월 이상, 납입횟수 6회 이상입니다. 청주 투기과열지구는 강화된 조건이 적용될 수 있습니다.' },
      { q: '청주 오창·오송 분양 전망은?', a: '첨단산업 취업자 증가로 실수요 수요가 탄탄합니다. KTX 오송역 인근 단지는 교통 호재로 관심이 높습니다.' },
    ],
  },
  '충남': {
    intro: '충청남도는 천안·아산을 중심으로 삼성·현대 등 대기업 산업단지 배후 주거 수요가 형성돼 있습니다. 내포신도시 등 행정타운 개발도 진행 중입니다.',
    features: ['천안·아산 삼성·현대 산업단지 배후', '내포신도시 충남도청 이전 개발', 'KTX 천안아산역 역세권', '수도권 전철 1호선 연장'],
    hotAreas: ['천안시 서북구', '아산시', '홍성군(내포)', '당진시', '서산시'],
    avgPrice: '2억~5억원대 (전용 84㎡ 기준)',
    faq: [
      { q: '충남 청약 1순위 조건은?', a: '충남 거주, 청약통장 가입 6개월 이상, 납입횟수 6회 이상입니다. 천안·아산 인기 지역은 수도권 청약자도 경쟁합니다.' },
      { q: '천안 아산 청약 메리트는?', a: '서울까지 KTX 40분대 접근 가능하며 대기업 취업자 실수요가 탄탄합니다. 수도권 대비 저렴한 분양가도 매력입니다.' },
    ],
  },
  '전북': {
    intro: '전라북도는 전주시를 중심으로 주거 시장이 형성돼 있습니다. 새만금 개발사업과 전북특별자치도 출범으로 장기 개발 기대감이 있습니다.',
    features: ['새만금 국제개발사업 진행', '전북특별자치도 출범 개발 기대', '전주 에코시티·혁신도시 공급', '합리적 분양가'],
    hotAreas: ['전주시 완산구', '전주시 덕진구', '익산시', '군산시', '완주군'],
    avgPrice: '1.5억~4억원대 (전용 84㎡ 기준)',
    faq: [
      { q: '전북 청약 1순위 조건은?', a: '전북 거주, 청약통장 가입 6개월 이상, 납입횟수 6회 이상입니다. 비수도권으로 조건이 비교적 완화돼 있습니다.' },
      { q: '새만금 개발로 군산 분양 전망은?', a: '새만금 사업 진행에 따라 장기적으로 주거 수요 유입이 예상됩니다. 다만 개발 일정에 따른 변동성을 고려해야 합니다.' },
    ],
  },
  '전남': {
    intro: '전라남도는 광양·여수·순천 등 남해안 산업지역과 나주혁신도시를 중심으로 주거 수요가 형성됩니다. 전국 대비 저렴한 분양가로 실수요자에게 기회가 있습니다.',
    features: ['나주혁신도시 공공기관 이전', '광양·여수 석유화학·철강 산업단지', '순천만 생태도시 발전', '남해안권 관광 개발'],
    hotAreas: ['순천시', '여수시', '광양시', '나주시', '목포시'],
    avgPrice: '1.5억~3.5억원대 (전용 84㎡ 기준)',
    faq: [
      { q: '전남 청약 1순위 조건은?', a: '전남 거주, 청약통장 가입 6개월 이상, 납입횟수 6회 이상입니다. 비수도권 중에서도 조건이 가장 완화된 편입니다.' },
      { q: '나주혁신도시 분양 전망은?', a: '한국전력 등 공공기관 이전으로 안정적인 수요가 형성돼 있습니다. 교통 개선이 이루어지면 가치 상승이 기대됩니다.' },
    ],
  },
  '경북': {
    intro: '경상북도는 포항·구미·경산을 중심으로 산업단지 배후 주거 수요가 있습니다. 경북도청 이전(안동·예천)과 포스코·삼성전자 산업 기반이 시장을 뒷받침합니다.',
    features: ['포항 포스코·철강 산업단지', '구미 삼성·LG 전자산업단지', '경북도청 신도시(안동·예천)', '경산 대학가 주거 수요'],
    hotAreas: ['포항시 남구', '구미시', '경산시', '경주시', '안동시'],
    avgPrice: '1.5억~4억원대 (전용 84㎡ 기준)',
    faq: [
      { q: '경북 청약 1순위 조건은?', a: '경북 거주, 청약통장 가입 6개월 이상, 납입횟수 6회 이상입니다.' },
      { q: '포항 청약 시장은?', a: '포스코 관련 산업 종사자 실수요가 있으나 산업 변화에 따른 변동성도 있습니다. 남구 대잠동 등 선호 지역 신규 단지는 경쟁률이 있습니다.' },
    ],
  },
  '경남': {
    intro: '경상남도는 창원·김해·양산을 중심으로 대규모 아파트 공급이 이루어집니다. 창원 스마트시티와 진해 신항만 개발 등 대형 프로젝트가 진행 중입니다.',
    features: ['창원 스마트산업단지 개발', '진해 신항만·물류단지 개발', '김해·양산 부산권 연계 수요', '거제·통영 조선·해양 배후 주거'],
    hotAreas: ['창원시 성산구', '김해시', '양산시', '진주시', '거제시'],
    avgPrice: '2억~5억원대 (전용 84㎡ 기준)',
    faq: [
      { q: '경남 청약 1순위 조건은?', a: '경남 거주, 청약통장 가입 6개월 이상, 납입횟수 6회 이상입니다. 창원 등 인기 지역은 부산·울산 거주자도 경쟁합니다.' },
      { q: '창원 아파트 청약 전망은?', a: '창원은 방산·기계 산업 안정 수요와 스마트시티 개발로 장기 전망이 양호합니다. 성산구 사파동 등 도심 입지가 선호됩니다.' },
    ],
  },
  '제주': {
    intro: '제주특별자치도는 관광·이주 수요와 함께 아파트 공급이 이루어지고 있습니다. 내국인 이주 수요와 제주 2공항 개발 호재로 장기적 관심이 지속됩니다.',
    features: ['관광·이주 인구 유입 수요', '제주 제2공항 개발 호재', '서귀포 혁신도시 개발', '외국인 투자이민 제도'],
    hotAreas: ['제주시 노형동', '제주시 연동', '서귀포시', '애월읍', '구좌읍'],
    avgPrice: '3억~7억원대 (전용 84㎡ 기준)',
    faq: [
      { q: '제주 청약 1순위 조건은?', a: '제주 거주, 청약통장 가입 6개월 이상, 납입횟수 6회 이상입니다.' },
      { q: '제주 아파트 투자 시 주의사항은?', a: '제주는 토지거래허가구역 지정 지역이 있어 취득 전 규제 여부 확인이 필수입니다. 계절별 수요 변동성도 고려해야 합니다.' },
    ],
  },
};

export const revalidate = 3600; // 1시간 캐시 후 재검증

export async function generateMetadata({ params }: { params: Promise<{ sido: string }> }): Promise<Metadata> {
  const { sido: rawSido } = await params;
  const sido = decodeURIComponent(rawSido);
  const fullName = REGION_LABELS[sido];
  if (!fullName) return { title: '지역 정보 | mk-land.kr' };
  return {
    title: `${sido} 청약·분양 모아보기 — ${fullName} 아파트 청약정보 & 분양 매물 | mk-land.kr`,
    description: `${fullName} 아파트 청약 일정, 미분양 분양 매물, 실거래가를 한 페이지에서 확인하세요. 2026년 최신 ${sido} 청약·분양 정보.`,
    alternates: { canonical: `https://www.mk-land.kr/region/${encodeURIComponent(sido)}` },
    openGraph: {
      title: `${sido} 청약·분양 모아보기 | mk-land.kr`,
      description: `${fullName} 아파트 청약정보 & 분양 매물 한눈에`,
      url: `https://www.mk-land.kr/region/${encodeURIComponent(sido)}`,
    },
  };
}

function fmt만원(v: number) {
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
  if (v >= 10000) return `${Math.floor(v / 10000).toLocaleString()}만`;
  return `${v.toLocaleString()}원`;
}

export default async function RegionPage({ params }: { params: Promise<{ sido: string }> }) {
  const { sido: rawSido } = await params;
  const sido = decodeURIComponent(rawSido);
  const fullName = REGION_LABELS[sido];
  if (!fullName) notFound();

  // 분양정보 (Supabase)
  const { data: unsoldListings } = await supabase
    .from('unsold_listings')
    .select('id, name, location, category, listing_type, min_price, max_price, thumbnail_url, benefit, highlight')
    .eq('is_active', true)
    .ilike('location', `${sido} %`)
    .order('created_at', { ascending: false });

  // 청약정보는 실시간 API라 별도 링크로 안내

  // 실거래가 링크: 시도별 대표 시군구 + 동 선택
  const DEFAULT_SIGUNGU_DONG: Record<string, { sigungu: string; dong: string }> = {
    '서울': { sigungu: '마포구', dong: '아현동' },
    '경기': { sigungu: '수원시 영통구', dong: '영통동' },
    '인천': { sigungu: '부평구', dong: '부평동' },
    '부산': { sigungu: '해운대구', dong: '우동' },
    '대구': { sigungu: '수성구', dong: '범어동' },
    '광주': { sigungu: '서구', dong: '치평동' },
    '대전': { sigungu: '서구', dong: '둔산동' },
    '울산': { sigungu: '남구', dong: '삼산동' },
    '세종': { sigungu: '세종시', dong: '어진동' },
    '강원': { sigungu: '춘천시', dong: '퇴계동' },
    '충북': { sigungu: '청주시 흥덕구', dong: '가경동' },
    '충남': { sigungu: '천안시 서북구', dong: '불당동' },
    '전북': { sigungu: '전주시 완산구', dong: '효자동' },
    '전남': { sigungu: '여수시', dong: '학동' },
    '경북': { sigungu: '포항시 남구', dong: '대잠동' },
    '경남': { sigungu: '창원시 성산구', dong: '사파동' },
    '제주': { sigungu: '제주시', dong: '노형동' },
  };
  const defaultArea = DEFAULT_SIGUNGU_DONG[sido];
  const firstDistrict = defaultArea
    ? (LAWD_CODE_MAP as any)[sido]?.find((d: any) => d.name === defaultArea.sigungu)
      ?? (LAWD_CODE_MAP as any)[sido]?.[0]
    : (LAWD_CODE_MAP as any)[sido]?.[0];
  const tradeUrl = firstDistrict
    ? `/trade?sido=${encodeURIComponent(sido)}&sigungu=${encodeURIComponent(firstDistrict.name)}${defaultArea ? `&dong=${encodeURIComponent(defaultArea.dong)}` : ''}`
    : '/trade';

  const allRegions = Object.keys(REGION_LABELS);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '홈', item: 'https://www.mk-land.kr' },
          { '@type': 'ListItem', position: 2, name: `${sido} 청약·분양 모아보기`, item: `https://www.mk-land.kr/region/${encodeURIComponent(sido)}` },
        ],
      },
      {
        '@type': 'CollectionPage',
        name: `${sido} 청약·분양 모아보기`,
        description: `${fullName} 아파트 청약 일정, 미분양 분양 매물, 실거래가를 한 페이지에서 확인하세요.`,
        url: `https://www.mk-land.kr/region/${encodeURIComponent(sido)}`,
        isPartOf: { '@type': 'WebSite', url: 'https://www.mk-land.kr', name: 'mk-land.kr' },
      },
    ],
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <GlobalNav />
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', padding: '36px 16px 32px', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '0 0 6px' }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>홈</Link>
          {' › '}{sido}
        </p>
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 8px' }}>
          {sido} 청약 · 분양 모아보기
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, margin: 0 }}>
          {fullName} 청약 일정, 분양 매물, 실거래가를 한 페이지에서 확인하세요
        </p>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 16px 64px' }}>

        {/* 빠른 이동 버튼 */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
          <Link href={`/region/${sido}#unsold`}
            style={{ padding: '8px 16px', background: '#059669', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
            🏷️ 분양정보 {unsoldListings?.length ? `(${unsoldListings.length})` : ''}
          </Link>
          <Link href={`/?region=${encodeURIComponent(sido)}`}
            style={{ padding: '8px 16px', background: '#1d4ed8', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
            📋 청약정보 보기
          </Link>
          <Link href={tradeUrl}
            style={{ padding: '8px 16px', background: '#7c3aed', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
            📊 실거래가 조회 →
          </Link>
        </div>

        {/* ── 분양정보 ── */}
        <section id="unsold" style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e3a5f', margin: 0 }}>🏷️ {sido} 분양 매물</h2>
            <Link href="/unsold" style={{ fontSize: 13, color: '#059669', textDecoration: 'none' }}>전체보기 →</Link>
          </div>

          {!unsoldListings || unsoldListings.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 12, padding: '28px 24px', color: '#374151' }}>
              <p style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', margin: '0 0 20px' }}>현재 등록된 {sido} 분양 매물이 없습니다.</p>
              {REGION_INFO[sido] && (
                <div>
                  <p style={{ fontSize: 14, lineHeight: 1.8, color: '#374151', margin: '0 0 20px' }}>{REGION_INFO[sido].intro}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                    {REGION_INFO[sido].features.map(f => (
                      <span key={f} style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20 }}>{f}</span>
                    ))}
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', margin: '0 0 8px' }}>주요 청약 관심 지역</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                    {REGION_INFO[sido].hotAreas.map(a => (
                      <span key={a} style={{ background: '#f0fdf4', color: '#059669', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20 }}>📍 {a}</span>
                    ))}
                  </div>
                  <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>
                    <span style={{ fontWeight: 700, color: '#374151' }}>평균 분양가(참고):</span> {REGION_INFO[sido].avgPrice}
                  </p>
                  <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 20 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#1e3a5f', margin: '0 0 12px' }}>자주 묻는 질문</p>
                    {REGION_INFO[sido].faq.map((item, i) => (
                      <div key={i} style={{ marginBottom: 14 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: '0 0 4px' }}>Q. {item.q}</p>
                        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7, margin: 0 }}>A. {item.a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {unsoldListings.map(item => (
                <Link key={item.id} href={`/unsold/${item.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: '#fff', borderRadius: 12, overflow: 'hidden',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
                    border: item.highlight ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                    transition: 'box-shadow 0.15s',
                  }}>
                    <div style={{ width: '100%', height: 160, background: '#e2e8f0', position: 'relative', overflow: 'hidden' }}>
                      {item.thumbnail_url
                        ? <img src={item.thumbnail_url} alt={item.name} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 40 }}>🏢</div>
                      }
                      <span style={{
                        position: 'absolute', top: 8, left: 8,
                        background: item.listing_type === '청약중' ? '#059669' : '#d97706',
                        color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                      }}>
                        {item.listing_type === '청약중' ? '🟢 청약중' : '🟡 잔여세대'}
                      </span>
                    </div>
                    <div style={{ padding: '14px 16px' }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', margin: '0 0 4px' }}>{item.name}</p>
                      <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px' }}>📍 {item.location}</p>
                      {(item.min_price || item.max_price) && (
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8', margin: 0 }}>
                          {item.min_price && item.max_price
                            ? `${fmt만원(item.min_price)} ~ ${fmt만원(item.max_price)}`
                            : item.min_price ? fmt만원(item.min_price) : fmt만원(item.max_price!)}
                        </p>
                      )}
                      {item.benefit && <p style={{ fontSize: 12, color: '#059669', margin: '6px 0 0', fontWeight: 600 }}>🎁 {item.benefit}</p>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── 청약정보 ── */}
        <section id="sale" style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e3a5f', margin: 0 }}>📋 {sido} 청약정보</h2>
            <Link href="/" style={{ fontSize: 13, color: '#1d4ed8', textDecoration: 'none' }}>전체보기 →</Link>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, padding: '28px 32px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 6px' }}>📋 {sido} 청약 일정을 확인하세요</p>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>청약홈 실시간 데이터 기반 · 접수중·예정 단지 모두 포함</p>
            </div>
            <Link href={`/?region=${encodeURIComponent(sido)}`}
              style={{ padding: '12px 24px', background: '#1d4ed8', color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>
              {sido} 청약정보 보기 →
            </Link>
          </div>
        </section>

        {/* ── 실거래가 바로가기 ── */}
        <div style={{ background: '#1e293b', borderRadius: 16, padding: '24px', marginBottom: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: 16, margin: '0 0 4px' }}>📊 {sido} 아파트 실거래가</p>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>국토교통부 실거래가 데이터 · 지역별 최신 거래 현황</p>
          </div>
          <Link href={tradeUrl}
            style={{ padding: '12px 24px', background: '#fff', color: '#1e293b', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
            실거래가 조회하기 →
          </Link>
        </div>

        {/* ── 다른 지역 ── */}
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e3a5f', marginBottom: 12 }}>다른 지역 보기</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {allRegions.filter(r => r !== sido).map(r => (
              <Link key={r} href={`/region/${r}`}
                style={{ padding: '6px 14px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 20, textDecoration: 'none', fontSize: 13, color: '#374151', fontWeight: 500 }}>
                {r}
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
