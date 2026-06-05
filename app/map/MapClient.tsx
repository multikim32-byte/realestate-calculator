'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import type { MapUnsoldItem, MapSaleItem } from './page';
import type { DistrictPrice, PriceStats } from '@/app/api/map-prices/route';
import type { DongPrice } from '@/app/api/map-prices/dong/route';
import type { MapComplex } from '@/app/api/map/complexes/route';
import { useFavorites } from '@/lib/useFavorites';

type AgeTab = 'all' | 'y5' | 'y10' | 'y15' | 'y20';

// 주소 문자열에서 sido-sigungu-name 슬러그 생성
const SIDO_ABBR: Record<string, string> = {
  '서울특별시': '서울', '부산광역시': '부산', '대구광역시': '대구', '인천광역시': '인천',
  '광주광역시': '광주', '대전광역시': '대전', '울산광역시': '울산', '세종특별자치시': '세종',
  '경기도': '경기', '강원특별자치도': '강원', '강원도': '강원',
  '충청북도': '충북', '충청남도': '충남', '전라북도': '전북', '전북특별자치도': '전북',
  '전라남도': '전남', '경상북도': '경북', '경상남도': '경남', '제주특별자치도': '제주',
};
function locationToSlug(location: string, name: string): string {
  const parts = location.trim().split(/\s+/);
  const sido = SIDO_ABBR[parts[0]] ?? parts[0].replace(/(특별시|광역시|특별자치시|특별자치도|도)$/, '');
  const sigungu = parts[1] ?? '';
  const normalize = (s: string) => s.replace(/\s+/g, '-').replace(/[^\w가-힣-]/g, '');
  return `${normalize(sido)}-${normalize(sigungu)}-${normalize(name)}`;
}
type PriceOverlayItem = { overlay: KakaoCustomOverlay; div: HTMLDivElement; data: DistrictPrice };

interface Props {
  unsoldListings: MapUnsoldItem[];
}

type PinType = 'unsold' | 'sale';

interface PinInfo {
  type: PinType;
  item: MapUnsoldItem | MapSaleItem;
}

const KAKAO_KEY      = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
const UNSOLD_COLOR   = '#1d4ed8';
const SALE_COLOR     = '#059669';
const COMPLEX_COLOR  = '#7c3aed'; // 단지 시세 — 보라
const CONCURRENCY  = 8;

// 가격 티어 — ㎡당 만원 기준
const PRICE_TIERS = [
  { label: '2,000만↑/전용㎡',    min: 2000, bg: 'rgba(220,38,38,0.9)',  border: '#b91c1c' },
  { label: '1,200~2,000만/전용㎡', min: 1200, bg: 'rgba(234,88,12,0.9)',  border: '#c2410c' },
  { label: '700~1,200만/전용㎡',   min: 700,  bg: 'rgba(202,138,4,0.9)',  border: '#a16207' },
  { label: '400~700만/전용㎡',     min: 400,  bg: 'rgba(22,163,74,0.9)',  border: '#15803d' },
  { label: '400만 미만/전용㎡',    min: 0,    bg: 'rgba(37,99,235,0.9)',  border: '#1d4ed8' },
] as const;

const AGE_TABS: { key: AgeTab; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'y5',  label: '신축(5년↓)' },
  { key: 'y10', label: '준신축(10년↓)' },
  { key: 'y15', label: '중축(15년↓)' },
  { key: 'y20', label: '구축(20년↑)' },
];

// Kakao coord2RegionCode 반환 시도명 → LAWD_CODE_MAP 키 변환
const REGION_NAME_MAP: Record<string, string> = {
  '서울특별시': '서울', '경기도': '경기', '인천광역시': '인천',
  '부산광역시': '부산', '대구광역시': '대구', '광주광역시': '광주',
  '대전광역시': '대전', '울산광역시': '울산', '세종특별자치시': '세종',
  '강원도': '강원', '강원특별자치도': '강원',
  '충청북도': '충북', '충청남도': '충남',
  '전라북도': '전북', '전북특별자치도': '전북', '전라남도': '전남',
  '경상북도': '경북', '경상남도': '경남', '제주특별자치도': '제주',
};

function priceColor(avgPerM2: number) {
  return PRICE_TIERS.find(t => avgPerM2 >= t.min) ?? PRICE_TIERS[4];
}

function fmtW(v: number): string {
  if (v >= 10000) return `${(v / 10000).toFixed(1)}억`;
  if (v >= 1000)  return `${Math.round(v / 100) / 10}천만`;
  return `${v}만`;
}

function fmt(v: number) {
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
  if (v >= 10000) return `${Math.floor(v / 10000).toLocaleString()}만`;
  return `${v.toLocaleString()}원`;
}

function makeMarkerSvg(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22">
    <circle cx="11" cy="11" r="9" fill="${color}" stroke="white" stroke-width="2.5"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}


function saveCache(key: string, coords: { lat: number; lng: number }) {
  try { localStorage.setItem(key, JSON.stringify(coords)); } catch { /* ignore */ }
}

function getCachedByKey(key: string): { lat: number; lng: number } | null {
  try { const h = localStorage.getItem(key); return h ? JSON.parse(h) : null; } catch { return null; }
}

function bestMatch(places: KakaoPlaceResult[], name: string): KakaoPlaceResult | null {
  if (!places.length) return null;
  const norm = (s: string) => s.replace(/\s/g, '').toLowerCase();
  const target = norm(name);
  let best: KakaoPlaceResult | null = null, bestScore = 0;
  for (const p of places) {
    const pn = norm(p.place_name);
    const score = pn === target ? 100 : (target.includes(pn) || pn.includes(target)) ? 50 : 0;
    if (score > bestScore) { bestScore = score; best = p; }
  }
  return best; // score 0이면 null
}

// KakaoMap 컴포넌트와 동일한 주소 전처리: 번지/괄호 파싱
function parseAddress(raw: string) {
  const noParens = raw.replace(/\(.*?\)/g, '').replace(/（.*?）/g, '').trim();

  // 번지 주소 추출 ("덕계동 152번지 일원" → "경기 양주시 덕계동 152번지")
  let lotAddress = '';
  if (noParens.includes('번지')) {
    const beforeBunji = noParens.split('번지')[0];
    const firstLot = beforeBunji.split(',')[0].trim();
    lotAddress = (firstLot + '번지').replace(/일원.*$/g, '').trim();
  }

  // 동/읍/면 이하 번지 제거한 행정구역 주소
  const cleanAddress = noParens
    .replace(/\s*(산\s*)?\d[\d\-,\s]*번지.*$/g, '')
    .replace(/일원.*$/g, '')
    .replace(/[,\-\s]+$/g, '')
    .trim();

  // 동/읍/면/리/로/길 이상 세부 주소가 있어야 위치 정확도 신뢰 가능
  // "경기 양주시"처럼 시 수준만 있으면 false → 이름 검색으로 fallback
  const isPrecise = !!lotAddress || /[동읍면리]$|[동읍면리]\s+\d|[로길]\s+\d/.test(cleanAddress);

  return { lotAddress, cleanAddress, isPrecise };
}

// 미분양: 주소 우선(실제 사업지), 이름 검색은 주소가 완전 실패할 때만
// 청약: 주소→중심점 확보 후 단지명 근방 검색
function geocodePin(
  geocoder: KakaoGeocoder,
  ps: KakaoPlaces,
  address: string,
  name: string,
  type: PinType,
): Promise<{ lat: number; lng: number } | null> {
  const cacheKey = `gc5:${address}|${name}`;
  const cached = getCachedByKey(cacheKey);
  if (cached) return Promise.resolve(cached);

  const { lotAddress, cleanAddress, isPrecise } = parseAddress(address);
  const searchName = name.replace(/\s*\([^)]*\)\s*/g, '').trim();

  function save(coords: { lat: number; lng: number }) {
    saveCache(cacheKey, coords);
    return coords;
  }

  // 주소 cascade: 번지 → cleanAddress → 원본 순서로 시도
  function addrCascade(
    addrs: string[],
    onFound: (c: { lat: number; lng: number }) => void,
    onFail: () => void,
  ) {
    const [head, ...tail] = addrs.filter(Boolean);
    if (!head) { onFail(); return; }
    geocoder.addressSearch(head, (result: KakaoAddressResult[], status: string) => {
      if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
        onFound({ lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) });
      } else {
        addrCascade(tail, onFound, onFail);
      }
    });
  }

  // 단지명 근방 검색 (청약용) — 전국 → 중심 5km
  function nameSearchNear(center: { lat: number; lng: number } | null): Promise<{ lat: number; lng: number } | null> {
    return new Promise(res => {
      if (!searchName) { res(center); return; }
      ps.keywordSearch(searchName, (places: KakaoPlaceResult[], st: string) => {
        if (st === window.kakao.maps.services.Status.OK) {
          const hit = bestMatch(places, searchName);
          if (hit) { res(save({ lat: parseFloat(hit.y), lng: parseFloat(hit.x) })); return; }
        }
        if (center) {
          const latLng = new window.kakao.maps.LatLng(center.lat, center.lng);
          ps.keywordSearch(searchName, (p2: KakaoPlaceResult[], s2: string) => {
            const hit2 = s2 === window.kakao.maps.services.Status.OK ? p2[0] : null;
            res(save(hit2 ? { lat: parseFloat(hit2.y), lng: parseFloat(hit2.x) } : center));
          }, { location: latLng, radius: 5000 });
        } else {
          res(null);
        }
      });
    });
  }

  return new Promise(resolve => {
    const addrs = [lotAddress, cleanAddress, address].filter((a, i, arr) => a && arr.indexOf(a) === i);

    if (type === 'unsold' && isPrecise) {
      // 미분양 + 세부 주소 있음: 주소 우선 → 실패 시에만 이름 검색
      addrCascade(
        addrs,
        coords => resolve(save(coords)),
        async () => resolve(await nameSearchNear(null)),
      );
    } else if (type === 'unsold' && !isPrecise) {
      // 미분양 + 시/구 수준 주소: 바로 이름 검색 (시청 좌표 방지)
      nameSearchNear(null).then(resolve);
    } else {
      // 청약: 주소로 중심점 확보 → 단지명 근방 검색
      addrCascade(
        addrs,
        async center => resolve(await nameSearchNear(center)),
        async ()     => resolve(await nameSearchNear(null)),
      );
    }
  });
}

// 단지 오버레이 HTML 생성 (컴포넌트 외부 순수 함수)
function makeOverlayHTMLForIdle(c: MapComplex, stage: 1 | 2): string {
  const avgPrice  = c.avg_price ?? 0;
  const avgPyeong = c.avg_pyeong ?? 0;
  const hasPrice  = avgPrice > 0;
  const priceText = avgPrice >= 10000
    ? `${(avgPrice / 10000).toFixed(1)}억`
    : avgPrice > 0 ? `${Math.round(avgPrice / 1000)}천` : '';
  const nameLabel = c.name.length > 8 ? c.name.slice(0, 7) + '…' : c.name;

  if (stage === 1) {
    const builtYear  = c.built_year ?? 0;
    const totalUnits = c.total_units ?? 0;
    const metaLine = [
      builtYear  > 0 ? `${builtYear}년` : '',
      totalUnits > 0 ? `${totalUnits.toLocaleString()}세대` : '',
    ].filter(Boolean).join(' · ');

    return `
      <div style="display:inline-block;background:#1e3a8a;color:#fff;border-radius:8px;padding:4px 10px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3);min-width:56px;cursor:pointer;">
        ${hasPrice
          ? `<div style="font-size:10px;opacity:0.75;line-height:1.4">${avgPyeong}평${metaLine ? ` · ${metaLine}` : ''}</div>
             <div style="font-size:13px;font-weight:800;line-height:1.3">${priceText}</div>`
          : `<div style="font-size:11px;font-weight:700;line-height:1.4">${nameLabel}</div>
             ${metaLine ? `<div style="font-size:10px;opacity:0.75;line-height:1.3">${metaLine}</div>` : ''}`}
      </div>
      <div style="width:0;height:0;margin:0 auto;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #1e3a8a"></div>`;
  }
  return `
    <div style="display:inline-block;background:#1e3a8a;color:#fff;border-radius:6px;padding:3px 7px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.25);cursor:pointer;">
      <div style="font-size:11px;font-weight:800;line-height:1.3">${hasPrice ? priceText : nameLabel}</div>
    </div>
    <div style="width:0;height:0;margin:0 auto;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid #1e3a8a"></div>`;
}

export default function MapClient({ unsoldListings }: Props) {
  const mapRef     = useRef<HTMLDivElement>(null);
  const mapInst    = useRef<KakaoMapInstance | null>(null);
  const markersRef = useRef<{ m: KakaoMarker; type: PinType }[]>([]);

  const [filter, setFilter]   = useState({ unsold: true, sale: true, complex: true });
  const filterRef = useRef({ unsold: true, sale: true, complex: true });

  // 실제 지도에 올라간 마커 수 (geocoding 성공한 것만)
  const [placed, setPlaced]   = useState({ unsold: 0, sale: 0, complex: 0 });
  const [total, setTotal]     = useState({ unsold: unsoldListings.length, sale: 0, complex: 0 });

  // 단지 관련
  type KakaoClusterer = { clear(): void; addMarker(m: KakaoMarker): void; addMarkers(m: KakaoMarker[]): void };
  const complexMarkersRef     = useRef<{ m: KakaoMarker; overlay: KakaoCustomOverlay; ld: HTMLDivElement; data: MapComplex }[]>([]);
  const overlayStageRef       = useRef<1 | 2 | 3>(1); // 현재 오버레이 표시 단계
  const complexClustererRef   = useRef<KakaoClusterer | null>(null);
  const loadedComplexBoundsRef = useRef<string | null>(null); // 마지막 로드한 bounds 키
  const { toggle: toggleFav, isFav } = useFavorites();
  const [selectedComplex, setSelectedComplex] = useState<MapComplex | null>(null);
  const [complexTrades, setComplexTrades] = useState<Array<{
    date: string; area: number; price: number; floor: number;
    dong: string; buyerGbn: string; slerGbn: string;
    dealingGbn: string; agentSgg: string;
    rgstDate: string; cdealType: string; cdealDay: string;
  }> | null>(null);
  const [complexRents, setComplexRents]   = useState<Array<{ date: string; area: number; floor: number; deposit: number; monthly: number; contractType: string; contractEnd: string; useRRRight: string; preDeposit: number; preMonthly: number }> | null>(null);
  const [complexBuildYear, setComplexBuildYear] = useState<number | null>(null);
  const [complexNearby, setComplexNearby] = useState<{ dong?: string; floor_count?: number; nearby_transit?: Array<{ name: string; distance: number; category?: string }>; nearby_schools?: Array<{ name: string; distance: number; school_type?: string }>; nearby_infra?: Array<{ name: string; distance: number; label?: string; category?: string }> } | null>(null);
  const [dealType, setDealType] = useState<'매매' | '전세' | '월세'>('매매');
  const [selPyeong, setSelPyeong] = useState<number>(0);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PinInfo | null>(null);

  const [priceMode, setPriceMode] = useState(false);
  const [priceLoadState, setPriceLoadState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [ageTab, setAgeTab] = useState<AgeTab>('all');
  const [dongPanel, setDongPanel] = useState<{ districtName: string; code: string; dongs: DongPrice[] } | null>(null);
  const [dongLoading, setDongLoading] = useState(false);
  const [mapSearch, setMapSearch] = useState('');
  const [mapSearching, setMapSearching] = useState(false);
  const priceModeRef = useRef(false);
  const ageTabRef = useRef<AgeTab>('all');
  const priceOverlaysRef = useRef<PriceOverlayItem[]>([]);
  const loadedSidosRef = useRef(new Set<string>());
  const geocoderRef = useRef<KakaoGeocoder | null>(null);
  const placesRef = useRef<KakaoPlaces | null>(null);
  const unsoldClustererRef = useRef<{ clear(): void; addMarker(m: KakaoMarker): void; addMarkers(m: KakaoMarker[]): void } | null>(null);
  const saleClustererRef   = useRef<{ clear(): void; addMarker(m: KakaoMarker): void; addMarkers(m: KakaoMarker[]): void } | null>(null);
  const pinLabelsRef    = useRef<{ overlay: KakaoCustomOverlay; type: PinType }[]>([]);
  const labelsVisibleRef = useRef(false);

  // 청약 데이터 비동기 조율용 refs
  const saleDataRef     = useRef<MapSaleItem[]>([]);
  const saleLoadedRef   = useRef(false);
  const saleResolverRef = useRef<((items: MapSaleItem[]) => void) | null>(null);

  function applyFilter(next: typeof filter) {
    filterRef.current = next;
    setFilter(next);
    for (const { ref, type, active } of [
      { ref: unsoldClustererRef, type: 'unsold' as PinType, active: next.unsold },
      { ref: saleClustererRef,   type: 'sale'   as PinType, active: next.sale   },
    ]) {
      if (!ref.current) continue;
      ref.current.clear();
      if (active) {
        ref.current.addMarkers(markersRef.current.filter(m => m.type === type).map(m => m.m));
      }
    }
    // 단지 핀 토글
    if (complexClustererRef.current) {
      complexClustererRef.current.clear();
      if (next.complex) {
        complexClustererRef.current.addMarkers(complexMarkersRef.current.map(c => c.m));
      }
    }
    complexMarkersRef.current.forEach(({ overlay }) => {
      overlay.setMap(next.complex && mapInst.current ? mapInst.current : null);
    });
    // 라벨도 함께 토글
    pinLabelsRef.current.forEach(({ overlay, type }) => {
      overlay.setMap(next[type] && labelsVisibleRef.current ? mapInst.current : null);
    });
  }

  // 뷰포트 내 단지 핀 로드
  const loadComplexesInView = useCallback(async () => {
    if (!mapInst.current || !filterRef.current.complex) return;
    const map = mapInst.current;
    const bounds = map.getBounds();
    if (!bounds) return;

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const boundsKey = `${sw.getLat().toFixed(3)},${sw.getLng().toFixed(3)},${ne.getLat().toFixed(3)},${ne.getLng().toFixed(3)}`;
    if (boundsKey === loadedComplexBoundsRef.current) return;
    loadedComplexBoundsRef.current = boundsKey;

    const res = await fetch(`/api/map/complexes?swLat=${sw.getLat()}&swLng=${sw.getLng()}&neLat=${ne.getLat()}&neLng=${ne.getLng()}`);
    const { complexes } = await res.json() as { complexes: MapComplex[] };

    if (!mapInst.current || !filterRef.current.complex) return;

    // 기존 단지 마커 제거
    if (complexClustererRef.current) complexClustererRef.current.clear();
    complexMarkersRef.current.forEach(({ overlay }) => overlay.setMap(null));
    complexMarkersRef.current = [];

    // 투명 마커 (클러스터러용 — 실제 표시는 말풍선 오버레이)
    const transparentSvg = `data:image/svg+xml;charset=utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>')}`;
    const complexImg = new window.kakao.maps.MarkerImage(
      transparentSvg,
      new window.kakao.maps.Size(1, 1),
      { offset: new window.kakao.maps.Point(0, 0) },
    );

    for (const c of complexes) {
      const pos = new window.kakao.maps.LatLng(c.lat, c.lng);
      const marker = new window.kakao.maps.Marker({ position: pos, image: complexImg, title: c.name });

      const ld = document.createElement('div');
      ld.style.cssText = 'transform:translateX(-50%);text-align:center;cursor:pointer';

      const level = map.getLevel();
      const initStage: 1 | 2 = level <= 4 ? 1 : 2;
      ld.innerHTML = makeOverlayHTMLForIdle(c, initStage);

      const overlay = new window.kakao.maps.CustomOverlay({ position: pos, content: ld, yAnchor: 1 });

      window.kakao.maps.event.addListener(marker, 'click', () => {
        setSelectedComplex(c);
        setSelected(null);
        map.panTo(pos);
      });
      ld.addEventListener('click', () => {
        setSelectedComplex(c);
        setSelected(null);
        map.panTo(pos);
      });

      if (level <= 5) overlay.setMap(map);

      complexMarkersRef.current.push({ m: marker, overlay, ld, data: c });
      complexClustererRef.current?.addMarker(marker);
    }

    setPlaced(p => ({ ...p, complex: complexes.length }));
    setTotal(t => ({ ...t, complex: complexes.length }));
  }, []);

  // 지역 검색 → 지도 이동
  const handleMapSearch = useCallback((query: string) => {
    const map = mapInst.current;
    const ps  = placesRef.current;
    if (!map || !ps || !query.trim()) return;
    setMapSearching(true);
    ps.keywordSearch(query.trim(), (result: { y: string; x: string }[], status: string) => {
      setMapSearching(false);
      if (status !== 'OK' || !result.length) return;
      const lat = parseFloat(result[0].y);
      const lng = parseFloat(result[0].x);
      map.setCenter(new window.kakao.maps.LatLng(lat, lng));
      map.setLevel(5);
      loadedComplexBoundsRef.current = null;
    });
  }, []);

  // 내 위치로 이동
  const handleMyLocation = useCallback(() => {
    const map = mapInst.current;
    if (!map || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        map.setCenter(new window.kakao.maps.LatLng(coords.latitude, coords.longitude));
        map.setLevel(5);
        loadedComplexBoundsRef.current = null;
      },
      () => alert('위치 정보를 가져올 수 없습니다. 브라우저 위치 권한을 확인해주세요.'),
      { timeout: 8000 },
    );
  }, []);

  // 탭 변경 시 오버레이 색상/내용 즉시 업데이트
  function applyAgeTab(tab: AgeTab) {
    ageTabRef.current = tab;
    setAgeTab(tab);
    priceOverlaysRef.current.forEach(({ div, data }) => {
      const stats: PriceStats = data[tab];
      if (!stats || stats.count === 0) {
        div.style.opacity = '0.25';
        return;
      }
      div.style.opacity = '1';
      const color = priceColor(stats.avgPerM2);
      div.style.background = color.bg;
      div.style.borderColor = color.border;
      const label = data.name.split(' ').at(-1) ?? data.name;
      div.innerHTML = `${label}<br><span style="font-size:10px;font-weight:600;opacity:0.92">${fmtW(stats.avgPerM2)}/전용㎡</span>`;
      div.title = `${data.name}\n평균 ${fmtW(stats.avgTotal)} (${stats.count}건)\n㎡당 ${fmtW(stats.avgPerM2)}`;
    });
  }

  // 시세 오버레이 ON/OFF
  function togglePriceMode() {
    const next = !priceModeRef.current;
    priceModeRef.current = next;
    setPriceMode(next);
    if (!next) {
      priceOverlaysRef.current.forEach(({ overlay }) => overlay.setMap(null));
      return;
    }
    if (mapInst.current) {
      // 레벨 8 미만(너무 줌인)이면 구/시 오버레이가 보이도록 레벨 8로 조정
      if (mapInst.current.getLevel() < 8) mapInst.current.setLevel(8);
      priceOverlaysRef.current.forEach(({ overlay }) => overlay.setMap(mapInst.current));
    }
    loadSidoByCenter();
  }

  // 지도 중심 좌표 → 시도명 → 해당 시도 로드 (실패 시 서울 fallback)
  function loadSidoByCenter() {
    if (!mapInst.current) return;

    const tryLoad = (lat: number, lng: number) => {
      if (!geocoderRef.current) { loadSido('서울'); return; }
      geocoderRef.current.coord2RegionCode(lng, lat, (result: KakaoRegionResult[]) => {
        const region = result?.find((r: KakaoRegionResult) => r.region_type === 'H');
        const sido = region ? REGION_NAME_MAP[region.region_1depth_name] : null;
        loadSido(sido ?? '서울');
      });
    };

    const center = mapInst.current.getCenter();
    tryLoad(center.getLat(), center.getLng());
  }

  // 단일 시도 데이터 로드 (중복 방지 포함)
  const loadSido = useCallback(async (sido: string) => {
    if (loadedSidosRef.current.has(sido)) return;
    loadedSidosRef.current.add(sido);
    setPriceLoadState('loading');

    let data: DistrictPrice[];
    try {
      const res = await fetch(`/api/map-prices?sido=${encodeURIComponent(sido)}`);
      if (!res.ok) { setPriceLoadState('done'); return; }
      data = await res.json();
    } catch (e) { console.error('[시세] fetch 오류:', e); setPriceLoadState('done'); return; }

    for (const d of data) {
      try {
        const geocoder = geocoderRef.current;
        if (!geocoder || !mapInst.current) continue;

        const cacheKey = `gc-dist3:${d.code}`;
        let coords = getCachedByKey(cacheKey);

        if (!coords) {
          // "수원 장안구" → "수원시 장안구" / "종로구" 그대로
          const parts = d.name.trim().split(/\s+/);
          const addr = parts.length >= 2
            ? `${parts[0]}시 ${parts.slice(1).join(' ')}`
            : d.name;

          // 1차: addressSearch (행정구역명 직접)
          coords = await new Promise<{ lat: number; lng: number } | null>(resolve => {
            const timer = setTimeout(() => resolve(null), 4000);
            geocoder.addressSearch(addr, (result: KakaoAddressResult[], status: string) => {
              clearTimeout(timer);
              resolve(status === window.kakao.maps.services.Status.OK && result.length > 0
                ? { lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) }
                : null);
            });
          });

          // 2차: keywordSearch 폴백 ("구청/시청/군청")
          if (!coords) {
            const ps = placesRef.current;
            if (ps) {
              const shortName = parts.at(-1) ?? d.name;
              const suffix = shortName.endsWith('군') ? '군청' : shortName.endsWith('시') ? '시청' : '구청';
              coords = await new Promise<{ lat: number; lng: number } | null>(resolve => {
                const timer = setTimeout(() => resolve(null), 4000);
                ps.keywordSearch(shortName + suffix, (places: KakaoPlaceResult[], status: string) => {
                  clearTimeout(timer);
                  resolve(status === window.kakao.maps.services.Status.OK && places.length > 0
                    ? { lat: parseFloat(places[0].y), lng: parseFloat(places[0].x) }
                    : null);
                });
              });
              await new Promise(r => setTimeout(r, 80));
            }
          }

          if (coords) saveCache(cacheKey, coords);
          else console.warn('[시세] 좌표 획득 실패:', d.name);
          await new Promise(r => setTimeout(r, 60));
        }

        if (!coords || !mapInst.current) continue;

        const currentTab = ageTabRef.current;
        const stats: PriceStats = d[currentTab];
        const color = (stats?.count > 0) ? priceColor(stats.avgPerM2) : priceColor(0);
        const label = d.name.split(' ').at(-1) ?? d.name;

        const div = document.createElement('div');
        div.style.cssText = [
          `background:${color.bg}`,
          `border:1.5px solid ${color.border}`,
          `border-radius:5px`,
          `padding:3px 7px`,
          `font-size:11px`,
          `font-weight:700`,
          `color:#fff`,
          `white-space:nowrap`,
          `cursor:default`,
          `box-shadow:0 2px 6px rgba(0,0,0,0.22)`,
          `transform:translate(-50%,-50%)`,
          `line-height:1.4`,
          `text-align:center`,
          `opacity:${stats?.count > 0 ? '1' : '0.25'}`,
        ].join(';');

        const dispStats = stats?.count > 0 ? stats : d.all;
        div.innerHTML = `${label}<br><span style="font-size:10px;font-weight:600;opacity:0.92">${fmtW(dispStats.avgPerM2)}/전용㎡</span>`;
        div.title = `${d.name}\n평균 ${fmtW(dispStats.avgTotal)} (${dispStats.count}건)\n㎡당 ${fmtW(dispStats.avgPerM2)}`;

        div.style.cursor = 'pointer';
        div.addEventListener('click', () => {
          setDongLoading(true);
          setDongPanel(null);
          fetch(`/api/map-prices/dong?code=${d.code}`)
            .then(r => r.json())
            .then((dongs: DongPrice[]) => setDongPanel({ districtName: d.name, code: d.code, dongs }))
            .catch(() => setDongPanel({ districtName: d.name, code: d.code, dongs: [] }))
            .finally(() => setDongLoading(false));
        });

        const overlay = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(coords.lat, coords.lng),
          content: div,
          map: priceModeRef.current ? mapInst.current : null,
          zIndex: 5,
        });
        priceOverlaysRef.current.push({ overlay, div, data: d });
      } catch { /* 개별 오버레이 오류 무시 */ }
    }

    setPriceLoadState('done');
  }, []);

  // 지도 페이지에서 body 스크롤 차단 — footer 높이로 인해 페이지가 스크롤 가능해져
  // 태블릿이 드래그를 페이지 스크롤로 처리하는 문제 방지
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      document.documentElement.style.overflow = '';
    };
  }, []);

  // 청약 데이터 클라이언트 사이드 fetch (서버 타임아웃 방지)
  useEffect(() => {
    fetch('/api/sale?type=all&perPage=100')
      .then(r => r.ok ? r.json() : { items: [] })
      .then(({ items = [] }) => {
        const filtered: MapSaleItem[] = (items as MapSaleItem[])
          .filter(i => i.buildingType === '아파트' && i.status !== '청약마감')
          .map(i => ({
            houseManageNo: i.houseManageNo,
            name: i.name,
            location: i.location,
            status: i.status,
            receiptStart: i.receiptStart,
            receiptEnd: i.receiptEnd,
            buildingType: i.buildingType,
            totalUnits: i.totalUnits,
          }));
        saleDataRef.current = filtered;
        saleLoadedRef.current = true;
        setTotal(prev => ({ ...prev, sale: filtered.length }));
        saleResolverRef.current?.(filtered);
      })
      .catch(() => {
        saleLoadedRef.current = true;
        saleResolverRef.current?.([]);
      });
  }, []);

  // 단지 선택 시 실거래(12개월) + 전월세(12개월) + 주변환경 병렬 fetch
  useEffect(() => {
    if (!selectedComplex) {
      setComplexTrades(null); setComplexRents(null); setComplexNearby(null);
      setDealType('매매'); setSelPyeong(0);
      return;
    }
    setDetailLoading(true);
    setComplexTrades(null); setComplexRents(null); setComplexNearby(null);
    setComplexBuildYear(null);
    setDealType('매매'); setSelPyeong(0);
    const q = `name=${encodeURIComponent(selectedComplex.name)}&sido=${encodeURIComponent(selectedComplex.sido)}&sigungu=${encodeURIComponent(selectedComplex.sigungu)}&months=12`;
    Promise.all([
      fetch(`/api/complex/trade?${q}`).then(r => r.json()).catch(() => ({ trades: [] })),
      fetch(`/api/complex/rent?${q}`).then(r => r.json()).catch(() => ({ trades: [] })),
      fetch(`/api/complex/detail?kapt_code=${encodeURIComponent(selectedComplex.kapt_code)}`).then(r => r.json()).catch(() => ({})),
    ]).then(([tradeData, rentData, nearbyData]) => {
      setComplexTrades(tradeData.trades ?? []);
      setComplexRents(rentData.trades ?? []);
      setComplexNearby(nearbyData);
      if (tradeData.buildYear) setComplexBuildYear(tradeData.buildYear);
      setDetailLoading(false);
    });
  }, [selectedComplex?.kapt_code]);

  useEffect(() => {
    if (!KAKAO_KEY || !mapRef.current) return;

    function initMap() {
      if (!mapRef.current || mapInst.current) return;
      try {

      // 기본: 서울시청 / 접속자 위치 허용 시 해당 위치로 이동
      const map = new window.kakao.maps.Map(mapRef.current, {
        center: new window.kakao.maps.LatLng(37.5665, 126.9780),
        level: 5,
      });
      mapInst.current = map;

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            map.setCenter(new window.kakao.maps.LatLng(coords.latitude, coords.longitude));
            map.setLevel(5);
            loadedComplexBoundsRef.current = null; // 위치 이동 후 단지 핀 강제 재로드
          },
          () => { /* 거부 시 서울시청 유지 */ },
          { timeout: 5000, maximumAge: 60000 },
        );
      }

      const geocoder = new window.kakao.maps.services.Geocoder();
      const ps       = new window.kakao.maps.services.Places();
      geocoderRef.current = geocoder;
      placesRef.current   = ps;

      // 핀 클러스터링 (레벨 7 이상에서 자동 묶음)
      const clusterStyle = (color: string) => [{
        width: '48px', height: '48px', background: color,
        borderRadius: '50%', color: '#fff', textAlign: 'center',
        lineHeight: '48px', fontWeight: '800', fontSize: '14px',
        boxShadow: '0 3px 10px rgba(0,0,0,0.35)',
      }];
      unsoldClustererRef.current = new window.kakao.maps.MarkerClusterer({
        map, averageCenter: true, minLevel: 7, styles: clusterStyle(UNSOLD_COLOR),
      });
      saleClustererRef.current = new window.kakao.maps.MarkerClusterer({
        map, averageCenter: true, minLevel: 7, styles: clusterStyle(SALE_COLOR),
      });
      complexClustererRef.current = new window.kakao.maps.MarkerClusterer({
        map, averageCenter: true, minLevel: 6, styles: clusterStyle(COMPLEX_COLOR),
      });

      // 지도 이동/줌 시 처리
      window.kakao.maps.event.addListener(map, 'idle', () => {
        const level = map.getLevel();

        // 단지 핀 — 4단계 레벨 처리
        if (filterRef.current.complex) {
          if (level <= 7) loadComplexesInView(); // 레벨 7까지 데이터 로드 (클러스터용)

          if (level <= 4) {
            // 단계 1: 풀 태그 (이름+가격)
            if (overlayStageRef.current !== 1) {
              overlayStageRef.current = 1;
              complexMarkersRef.current.forEach(({ ld, data }) => {
                ld.innerHTML = makeOverlayHTMLForIdle(data, 1);
              });
            }
            complexMarkersRef.current.forEach(({ overlay }) => overlay.setMap(map));
          } else if (level <= 5) {
            // 단계 2: 컴팩트 태그 (가격만)
            if (overlayStageRef.current !== 2) {
              overlayStageRef.current = 2;
              complexMarkersRef.current.forEach(({ ld, data }) => {
                ld.innerHTML = makeOverlayHTMLForIdle(data, 2);
              });
            }
            complexMarkersRef.current.forEach(({ overlay }) => overlay.setMap(map));
          } else {
            // 단계 3~4: 클러스터만 표시, 오버레이 숨김
            complexMarkersRef.current.forEach(({ overlay }) => overlay.setMap(null));
          }
        }

        // 핀 라벨(미분양·매물): 레벨 5 이하에서만 표시
        const showLabels = level <= 5;
        if (showLabels !== labelsVisibleRef.current) {
          labelsVisibleRef.current = showLabels;
          pinLabelsRef.current.forEach(({ overlay, type }) => {
            overlay.setMap(showLabels && filterRef.current[type] ? map : null);
          });
        }

        // 시세 오버레이: 레벨 8 이상에서만 표시
        if (!priceModeRef.current) return;
        if (level < 8) {
          priceOverlaysRef.current.forEach(({ overlay }) => overlay.setMap(null));
          return;
        }
        priceOverlaysRef.current.forEach(({ overlay }) => overlay.setMap(map));
        const center = map.getCenter();
        geocoder.coord2RegionCode(center.getLng(), center.getLat(), (result: KakaoRegionResult[]) => {
          const region = result?.find((r: KakaoRegionResult) => r.region_type === 'H');
          const sido = region ? REGION_NAME_MAP[region.region_1depth_name] : null;
          if (sido && !loadedSidosRef.current.has(sido)) loadSido(sido);
        });
      });
      const unsoldImg = new window.kakao.maps.MarkerImage(
        makeMarkerSvg(UNSOLD_COLOR),
        new window.kakao.maps.Size(22, 22),
        { offset: new window.kakao.maps.Point(11, 11) },
      );
      const saleImg = new window.kakao.maps.MarkerImage(
        makeMarkerSvg(SALE_COLOR),
        new window.kakao.maps.Size(22, 22),
        { offset: new window.kakao.maps.Point(11, 11) },
      );

      function placeMarker(type: PinType, item: MapUnsoldItem | MapSaleItem, coords: { lat: number; lng: number }) {
        const marker = new window.kakao.maps.Marker({
          position: new window.kakao.maps.LatLng(coords.lat, coords.lng),
          image:    type === 'unsold' ? unsoldImg : saleImg,
          title:    (item as MapUnsoldItem | MapSaleItem).name,
          // map 직접 연결 안 함 — clusterer가 관리
        });
        window.kakao.maps.event.addListener(marker, 'click', () => {
          setSelected({ type, item });
          map.panTo(new window.kakao.maps.LatLng(coords.lat, coords.lng));
        });
        markersRef.current.push({ m: marker, type });
        if (type === 'unsold') unsoldClustererRef.current?.addMarker(marker);
        else                   saleClustererRef.current?.addMarker(marker);
        setPlaced(p => ({ ...p, [type]: p[type] + 1 }));

        // 줌인 시 표시할 라벨 (레벨 5 이하)
        const ld = document.createElement('div');
        let labelHtml = '';
        const borderColor = type === 'unsold' ? UNSOLD_COLOR : SALE_COLOR;
        if (type === 'unsold') {
          const u = item as MapUnsoldItem;
          const name = u.name.length > 11 ? u.name.slice(0, 10) + '…' : u.name;
          const price = u.min_price || u.max_price
            ? (u.min_price && u.max_price && u.min_price !== u.max_price
                ? `${fmt(u.min_price)}~${fmt(u.max_price)}`
                : fmt((u.min_price ?? u.max_price)!))
            : '';
          labelHtml = `${name}${price ? `<br><span style="font-size:10px;color:${UNSOLD_COLOR};font-weight:600">${price}</span>` : ''}`;
        } else {
          const s = item as MapSaleItem;
          const name = s.name.length > 11 ? s.name.slice(0, 10) + '…' : s.name;
          labelHtml = `${name}<br><span style="font-size:10px;color:${SALE_COLOR};font-weight:600">${s.status}</span>`;
        }
        ld.style.cssText = [
          'transform:translate(-50%,calc(-100% - 14px))',
          `border:1.5px solid ${borderColor}`,
          'background:#fff',
          'border-radius:6px',
          'padding:3px 8px',
          'font-size:11px',
          'font-weight:700',
          'color:#1e293b',
          'white-space:nowrap',
          'box-shadow:0 2px 8px rgba(0,0,0,0.15)',
          'line-height:1.4',
          'text-align:center',
          'cursor:pointer',
          'pointer-events:auto',
        ].join(';');
        ld.innerHTML = labelHtml;
        ld.addEventListener('click', (e) => {
          e.stopPropagation();
          const href = type === 'unsold'
            ? `/unsold/${(item as MapUnsoldItem).slug ?? (item as MapUnsoldItem).id}`
            : `/sale/${(item as MapSaleItem).houseManageNo}`;
          window.location.href = href;
        });
        const labelOverlay = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(coords.lat, coords.lng),
          content: ld,
          map: labelsVisibleRef.current && filterRef.current[type] ? map : null,
          zIndex: 4,
        });
        pinLabelsRef.current.push({ overlay: labelOverlay, type });
      }

      // 병렬 처리 헬퍼: 동시 CONCURRENCY 개씩 실행
      async function runParallel<T>(
        items: T[],
        fn: (item: T) => Promise<void>,
      ) {
        for (let i = 0; i < items.length; i += CONCURRENCY) {
          await Promise.all(items.slice(i, i + CONCURRENCY).map(fn));
        }
      }

      (async () => {
        // ─── 미분양 핀 처리 ───
        const unsoldPins = unsoldListings.map(i => ({ type: 'unsold' as PinType, item: i, address: i.location }));
        const uncachedUnsold: typeof unsoldPins = [];
        for (const pin of unsoldPins) {
          const item = pin.item as MapUnsoldItem;
          if (item.lat && item.lng) { placeMarker('unsold', item, { lat: item.lat, lng: item.lng }); continue; }
          const cacheKey = `gc5:${pin.address}|${pin.item.name}`;
          const coords = getCachedByKey(cacheKey);
          if (coords) placeMarker('unsold', pin.item, coords);
          else uncachedUnsold.push(pin);
        }
        await runParallel(uncachedUnsold, async pin => {
          const coords = await geocodePin(geocoder, ps, pin.address, pin.item.name, 'unsold');
          if (coords) placeMarker('unsold', pin.item, coords);
        });

        // ─── 청약 데이터 기다리기 (최대 10초) ───
        const saleItems = await Promise.race([
          new Promise<MapSaleItem[]>(resolve => {
            if (saleLoadedRef.current) { resolve(saleDataRef.current); return; }
            saleResolverRef.current = resolve;
          }),
          new Promise<MapSaleItem[]>(r => setTimeout(() => r([]), 10000)),
        ]);

        // ─── 청약 핀 처리 ───
        const salePins = saleItems.map(i => ({ type: 'sale' as PinType, item: i, address: i.location }));
        const uncachedSale: typeof salePins = [];
        for (const pin of salePins) {
          const cacheKey = `gc5:${pin.address}|${pin.item.name}`;
          const coords = getCachedByKey(cacheKey);
          if (coords) placeMarker('sale', pin.item, coords);
          else uncachedSale.push(pin);
        }
        await runParallel(uncachedSale, async pin => {
          const coords = await geocodePin(geocoder, ps, pin.address, pin.item.name, 'sale');
          if (coords) placeMarker('sale', pin.item, coords);
        });

        setLoading(false);
        // 단지 시세 기본 로드 (약간 지연 후 지도가 안정되면 실행)
        setTimeout(() => loadComplexesInView(), 800);
      })().catch(err => { console.error('[지도] 핀 배치 오류:', err); setLoading(false); });
      } catch (err) {
        console.error('[지도] 초기화 오류:', err);
        setLoading(false);
      }
    }

    const scriptId = 'kakao-map-sdk';
    const existing = document.getElementById(scriptId);
    if (existing) {
      if (window.kakao?.maps?.Map) {
        initMap();
      } else if (window.kakao?.maps?.load) {
        window.kakao.maps.load(initMap);
      } else {
        existing.addEventListener('load', () => window.kakao.maps.load(initMap), { once: true });
      }
      return;
    }
    const script = document.createElement('script');
    script.id  = scriptId;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&libraries=services,clusterer&autoload=false`;
    script.onload = () => window.kakao.maps.load(initMap);
    script.onerror = () => setLoading(false);
    document.head.appendChild(script);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', touchAction: 'none' }}>
      {/* 지도 */}
      <div ref={mapRef} style={{ width: '100%', height: '100%', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }} />

      {/* 지역 검색창 */}
      <div style={{
        position: 'absolute', top: 12, right: 12,
        zIndex: 10, display: 'flex', gap: 6, alignItems: 'center',
      }}>
        <form
          onSubmit={e => { e.preventDefault(); handleMapSearch(mapSearch); }}
          style={{ display: 'flex', background: '#fff', borderRadius: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.15)', overflow: 'hidden' }}
        >
          <input
            type="text"
            value={mapSearch}
            onChange={e => setMapSearch(e.target.value)}
            placeholder="지역·주소 검색"
            style={{
              border: 'none', outline: 'none', padding: '9px 12px',
              fontSize: 13, width: 160, color: '#1e293b', background: 'transparent',
            }}
          />
          <button type="submit" disabled={mapSearching} style={{
            border: 'none', background: mapSearching ? '#9ca3af' : '#1d4ed8',
            color: '#fff', padding: '0 12px', cursor: 'pointer', fontSize: 13, fontWeight: 700,
          }}>
            {mapSearching ? '…' : '🔍'}
          </button>
        </form>

        {/* 내 위치 버튼 */}
        <button
          onClick={handleMyLocation}
          title="내 위치로 이동"
          style={{
            background: '#fff', border: 'none', borderRadius: 10,
            width: 38, height: 38, cursor: 'pointer', fontSize: 17,
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          📍
        </button>
      </div>


      {/* 단지 시세 — 왼쪽 슬라이드 패널 */}
      {selectedComplex && !selected && (() => {
        const fmtPrice = (v: number) => v >= 10000 ? `${(v / 10000).toFixed(1)}억` : `${Math.round(v / 1000)}천만`;
        const toPyeong = (area: number) => Math.round(area / 3.3);

        // 공급면적 표시 레이블 생성
        const unitTypes = selectedComplex.unit_types ?? [];
        function areaLabel(exclusiveM2: number): string {
          const excPy = toPyeong(exclusiveM2);
          // 청약 데이터 있으면 정확한 공급면적 사용
          const match = unitTypes.find(u => Math.abs(u.exclusive_area - exclusiveM2) <= 1.5);
          if (match) return `${match.supply_pyeong}평 (공급 ${match.supply_area.toFixed(0)}㎡)`;
          // 없으면 추산 (전용 × 1.3)
          const supplyPy = Math.round(exclusiveM2 * 1.3 / 3.3);
          return `전용 ${excPy}평 (공급 약 ${supplyPy}평)`;
        }

        // 현재 탭 raw 데이터 (전세 = monthly===0, 월세 = monthly>0)
        const rawList = dealType === '매매'
          ? (complexTrades ?? [])
          : dealType === '전세'
            ? (complexRents ?? []).filter(t => t.monthly === 0)
            : (complexRents ?? []).filter(t => t.monthly > 0);

        // 면적 목록: 전용면적 기준 unique 목록
        const exclusiveAreas = [...new Set(rawList.map(t => Math.round(t.area * 100) / 100))].sort((a, b) => a - b);
        const pyeongList = [...new Set(rawList.map(t => toPyeong(t.area)))].sort((a, b) => a - b);
        const curPyeong  = selPyeong || (pyeongList[0] ?? 0);

        // 선택 면적으로 필터
        const filtered = rawList.filter(t => toPyeong(t.area) === curPyeong);

        // 최근 10건 테이블
        const tableRows = filtered.slice(0, 10);

        // 월별 평균가 차트 데이터 (최근 12개월)
        const monthMap = new Map<string, number[]>();
        for (const t of filtered) {
          const ym = t.date.slice(0, 7);
          const val = dealType === '매매' ? (t as { price: number }).price : (t as { deposit: number }).deposit;
          if (!monthMap.has(ym)) monthMap.set(ym, []);
          monthMap.get(ym)!.push(val);
        }
        const chartData = [...monthMap.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([ym, prices]) => ({ ym, avg: Math.round(prices.reduce((s, v) => s + v, 0) / prices.length) }));

        // 1개월 평균
        const lastMonthAvg = chartData.at(-1)?.avg ?? 0;

        // SVG 차트 계산
        const W = 288; const H = 80; const PAD = 8;
        const vals = chartData.map(d => d.avg);
        const minV = Math.min(...vals); const maxV = Math.max(...vals);
        const range = maxV - minV || 1;
        const pts = chartData.map((d, i) => {
          const x = PAD + (i / Math.max(chartData.length - 1, 1)) * (W - PAD * 2);
          const y = H - PAD - ((d.avg - minV) / range) * (H - PAD * 2);
          return `${x},${y}`;
        }).join(' ');

        // 전세가율 계산 (매매·전세 같은 평형 평균 기준)
        const tradeFiltered  = (complexTrades ?? []).filter(t => toPyeong(t.area) === curPyeong);
        const jeonseFiltered = (complexRents  ?? []).filter(t => t.monthly === 0 && toPyeong(t.area) === curPyeong);
        const tradeAvgAll  = tradeFiltered.length  ? tradeFiltered.reduce((s, t)  => s + t.price,   0) / tradeFiltered.length  : 0;
        const jeonseAvgAll = jeonseFiltered.length ? jeonseFiltered.reduce((s, t) => s + t.deposit, 0) / jeonseFiltered.length : 0;
        const jeonseRatio  = tradeAvgAll > 0 && jeonseAvgAll > 0
          ? Math.round((jeonseAvgAll / tradeAvgAll) * 100) : null;

        const transit = complexNearby?.nearby_transit ?? [];
        const schools = complexNearby?.nearby_schools ?? [];
        const infra   = complexNearby?.nearby_infra ?? [];

        const TAB_STYLE = (active: boolean) => ({
          flex: 1, padding: '7px 0', fontSize: 13, fontWeight: active ? 700 : 500,
          border: 'none', cursor: 'pointer', borderBottom: active ? `2px solid ${COMPLEX_COLOR}` : '2px solid transparent',
          background: 'none', color: active ? COMPLEX_COLOR : '#9ca3af',
        } as React.CSSProperties);

        return (
          <>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: 'min(320px, 85vw)',
              background: '#fff',
              boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
              zIndex: 20, display: 'flex', flexDirection: 'column',
              animation: 'slideInLeft 0.22s ease-out',
            }}>
              {/* 헤더 */}
              {(() => {
                const faved = isFav(selectedComplex.kapt_code, 'complex');
                return (
                  <div style={{ background: COMPLEX_COLOR, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>{selectedComplex.name}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 3 }}>{selectedComplex.sido} {selectedComplex.sigungu}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => toggleFav({
                          id: selectedComplex.kapt_code,
                          type: 'complex',
                          name: selectedComplex.name,
                          location: `${selectedComplex.sido} ${selectedComplex.sigungu}`,
                          slug: selectedComplex.slug,
                          avg_price: selectedComplex.avg_price ?? undefined,
                          avg_pyeong: selectedComplex.avg_pyeong ?? undefined,
                        })}
                        title={faved ? '관심 단지 해제' : '관심 단지 저장'}
                        style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 15, flexShrink: 0 }}>
                        {faved ? '❤️' : '🤍'}
                      </button>
                      <button onClick={() => setSelectedComplex(null)}
                        style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: '#fff', fontSize: 15, flexShrink: 0 }}>
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* 기본 정보 */}
              {(() => {
                const dong = complexNearby?.dong;
                const address = [selectedComplex.sido, selectedComplex.sigungu, dong].filter(Boolean).join(' ');
                const builtYear = selectedComplex.built_year ?? complexBuildYear;
                const yearCount = builtYear ? new Date().getFullYear() - builtYear : null;
                const floorCount = complexNearby?.floor_count;
                return (
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>{address}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', flexWrap: 'wrap', gap: '2px 12px' }}>
                      <span>{selectedComplex.total_units ? `${selectedComplex.total_units.toLocaleString()}세대` : '세대 정보 없음'}</span>
                      {builtYear
                        ? <span>{builtYear}년 준공{yearCount !== null && yearCount >= 0 ? ` (${yearCount}년차)` : ''}</span>
                        : null
                      }
                      {floorCount ? <span>최고 {floorCount}층</span> : null}
                    </div>
                  </div>
                );
              })()}

              {/* 탭: 매매 / 전세 / 월세 */}
              <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                {(['매매', '전세', '월세'] as const).map(t => (
                  <button key={t} style={TAB_STYLE(dealType === t)} onClick={() => { setDealType(t); setSelPyeong(0); }}>{t}</button>
                ))}
              </div>

              {/* 스크롤 영역 */}
              <div style={{ flex: 1, overflowY: 'auto' }}>

                {detailLoading ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#9ca3af' }}>불러오는 중…</div>
                ) : (
                  <>
                    {/* 전세 현황 요약 카드 */}
                    {dealType === '전세' && complexRents && complexRents.length > 0 && (() => {
                      const today = Date.now();
                      const jeonseAll = complexRents.filter(t => t.monthly === 0);

                      // (층+면적) 기준 가장 최근 계약만 유지 — 같은 호수 중복 방지
                      const latestByUnit = new Map<string, typeof jeonseAll[0]>();
                      for (const t of jeonseAll) {
                        const key = `${t.floor}_${Math.round(t.area)}`;
                        const existing = latestByUnit.get(key);
                        if (!existing || t.date > existing.date) latestByUnit.set(key, t);
                      }
                      const dedupedJeonse = [...latestByUnit.values()];

                      // contractEnd(실제 만료일) 우선, 없으면 계약유형별 추산
                      const getExpiry = (t: typeof dedupedJeonse[0]) => {
                        if (t.contractEnd) return new Date(t.contractEnd).getTime();
                        const isRenewed = t.contractType === '갱신' || t.contractType === '재계약';
                        return new Date(t.date).getTime() + (isRenewed ? 4 : 2) * 365.25 * 24 * 3600 * 1000;
                      };
                      const active = dedupedJeonse.filter(t => getExpiry(t) > today);
                      const soonMs = today + 90 * 24 * 3600 * 1000;
                      const soon = active.filter(t => getExpiry(t) <= soonMs);
                      return (
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                          <div style={{ background: '#eff6ff', borderRadius: 8, padding: '8px 10px' }}>
                            <div style={{ fontSize: 10, color: '#9ca3af' }}>거주중 추정</div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: '#1d4ed8' }}>{active.length}건</div>
                          </div>
                          <div style={{ background: soon.length > 0 ? '#fefce8' : '#f9fafb', borderRadius: 8, padding: '8px 10px' }}>
                            <div style={{ fontSize: 10, color: '#9ca3af' }}>3개월내 만료</div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: soon.length > 0 ? '#d97706' : '#9ca3af' }}>{soon.length}건</div>
                          </div>
                          <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 10px' }}>
                            <div style={{ fontSize: 10, color: '#9ca3af' }}>조회 건수</div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: '#6b7280' }}>{jeonseAll.length}건</div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 면적 셀렉터 + 평균가 */}
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>면적</span>
                        {pyeongList.length === 0 ? (
                          <span style={{ fontSize: 12, color: '#9ca3af' }}>거래 데이터 없음</span>
                        ) : (
                          <select
                            value={curPyeong}
                            onChange={e => setSelPyeong(Number(e.target.value))}
                            style={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 6, padding: '3px 8px', color: '#1e293b', background: '#fff', cursor: 'pointer' }}
                          >
                            {exclusiveAreas.map(area => {
                            const py = toPyeong(area);
                            return <option key={area} value={py}>{areaLabel(area)}</option>;
                          })}
                          </select>
                        )}
                      </div>
                      {lastMonthAvg > 0 && (
                        <>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>
                            {dealType === '월세' ? '최근 보증금 평균' : `최근 ${dealType} 평균`}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{fmtPrice(lastMonthAvg)}</div>
                            {jeonseRatio !== null && (dealType === '매매' || dealType === '전세') && (
                              <span style={{
                                fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                                background: jeonseRatio >= 70 ? '#fef2f2' : jeonseRatio >= 50 ? '#fefce8' : '#f0fdf4',
                                color:      jeonseRatio >= 70 ? '#dc2626' : jeonseRatio >= 50 ? '#ca8a04' : '#16a34a',
                              }}>
                                전세가율 {jeonseRatio}%
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* 가격 차트 */}
                    {chartData.length > 1 && (
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>월별 평균 추이</div>
                        <svg width={W} height={H} style={{ overflow: 'visible' }}>
                          <polyline points={pts} fill="none" stroke={COMPLEX_COLOR} strokeWidth={2} strokeLinejoin="round" />
                          {chartData.map((d, i) => {
                            const x = PAD + (i / Math.max(chartData.length - 1, 1)) * (W - PAD * 2);
                            const y = H - PAD - ((d.avg - minV) / range) * (H - PAD * 2);
                            return <circle key={i} cx={x} cy={y} r={3} fill={COMPLEX_COLOR} />;
                          })}
                          <text x={PAD} y={H - 1} fontSize={9} fill="#9ca3af">{chartData[0]?.ym?.slice(0, 7)}</text>
                          <text x={W - PAD} y={H - 1} fontSize={9} fill="#9ca3af" textAnchor="end">{chartData.at(-1)?.ym?.slice(0, 7)}</text>
                        </svg>
                      </div>
                    )}

                    {/* 최근 거래 테이블 */}
                    {(() => {
                      // 전세/월세 계약 상태 계산
                      function contractStatus(dateStr: string, isMonthly: boolean, contractType = '', contractEnd = '') {
                        const today = Date.now();
                        const deal  = new Date(dateStr).getTime();

                        if (isMonthly) {
                          const exp = contractEnd
                            ? new Date(contractEnd).getTime()
                            : deal + 365.25 * 24 * 3600 * 1000;
                          const d = Math.round((exp - today) / 86400000);
                          if (d < 0)   return { label: '만료됨',          color: '#6b7280', bg: '#f1f5f9' };
                          if (d <= 90) return { label: `만료임박 D-${d}`, color: '#d97706', bg: '#fefce8' };
                          return             { label: `거주중 D-${d}`,    color: '#059669', bg: '#f0fdf4' };
                        }

                        // 전세: contractEnd(실제 만료일) 우선
                        const isRenewed = contractType === '갱신' || contractType === '재계약';
                        if (contractEnd) {
                          const exp = new Date(contractEnd).getTime();
                          const d = Math.round((exp - today) / 86400000);
                          if (d < 0)   return { label: '만료됨',          color: '#6b7280', bg: '#f1f5f9' };
                          if (d <= 90) return { label: `만료임박 D-${d}`, color: '#d97706', bg: '#fefce8' };
                          const tag = isRenewed ? (contractType === '재계약' ? '재계약중' : '갱신중') : '거주중';
                          return             { label: `${tag} D-${d}`,   color: isRenewed ? '#7c3aed' : '#059669', bg: isRenewed ? '#ede9fe' : '#f0fdf4' };
                        }

                        // contractEnd 없을 때 추산
                        const expiry2 = deal + 2 * 365.25 * 24 * 3600 * 1000;
                        const expiry4 = deal + 4 * 365.25 * 24 * 3600 * 1000;
                        const daysTo2 = Math.round((expiry2 - today) / 86400000);
                        const daysTo4 = Math.round((expiry4 - today) / 86400000);
                        if (daysTo4 < 0)   return { label: '만료됨',                       color: '#6b7280', bg: '#f1f5f9' };
                        if (daysTo2 < 0)   return { label: `갱신중 +${Math.abs(daysTo2)}일`, color: '#7c3aed', bg: '#ede9fe' };
                        if (daysTo2 <= 90) return { label: `만료임박 D-${daysTo2}`,          color: '#d97706', bg: '#fefce8' };
                        return                    { label: `거주중 D-${daysTo2}`,            color: '#059669', bg: '#f0fdf4' };
                      }
                      const showStatus = dealType === '전세' || dealType === '월세';
                      return (
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>최근 실거래</div>
                          {tableRows.length === 0 ? (
                            <div style={{ fontSize: 12, color: '#9ca3af' }}>해당 면적 거래 없음</div>
                          ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                              <thead>
                                <tr style={{ color: '#9ca3af' }}>
                                  <th style={{ textAlign: 'left', paddingBottom: 5, fontWeight: 500 }}>계약일</th>
                                  <th style={{ textAlign: 'right', paddingBottom: 5, fontWeight: 500 }}>층</th>
                                  <th style={{ textAlign: 'right', paddingBottom: 5, fontWeight: 500 }}>
                                    {dealType === '월세' ? '보증/월세' : dealType === '전세' ? '전세가' : '매매가'}
                                  </th>
                                  {showStatus && <th style={{ textAlign: 'right', paddingBottom: 5, fontWeight: 500 }}>상태</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {tableRows.map((t, i) => {
                                  const priceCell = dealType === '매매'
                                    ? fmtPrice((t as { price: number }).price)
                                    : dealType === '전세'
                                      ? fmtPrice((t as { deposit: number }).deposit)
                                      : `${fmtPrice((t as { deposit: number }).deposit)}/${(t as { monthly: number }).monthly}만`;
                                  const status = showStatus
                                    ? contractStatus(t.date, dealType === '월세', (t as { contractType?: string }).contractType, (t as { contractEnd?: string }).contractEnd)
                                    : null;
                                  const tr = t as {
                                    dealingGbn?: string; agentSgg?: string;
                                    dong?: string; buyerGbn?: string; slerGbn?: string;
                                    rgstDate?: string; cdealType?: string; cdealDay?: string;
                                    contractType?: string; contractEnd?: string;
                                  };
                                  const isCancelled = !!tr.cdealType;
                                  return (
                                    <tr key={i} style={{ borderTop: '1px solid #f8fafc', opacity: isCancelled ? 0.45 : 1 }}>
                                      <td style={{ padding: '5px 0', color: '#6b7280', verticalAlign: 'top' }}>
                                        {t.date.slice(2).replace(/-/g, '.')}
                                        {tr.rgstDate && <div style={{ fontSize: 9, color: '#9ca3af' }}>등기 {tr.rgstDate.slice(2).replace(/\./g, '.')}</div>}
                                        {isCancelled && <div style={{ fontSize: 9, color: '#dc2626' }}>해제 {tr.cdealDay}</div>}
                                      </td>
                                      <td style={{ padding: '5px 0', textAlign: 'right', color: '#6b7280', verticalAlign: 'top' }}>
                                        {tr.dong ? `${tr.dong} ` : ''}{t.floor}층
                                      </td>
                                      <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: 700, color: '#1e293b', verticalAlign: 'top' }}>
                                        {priceCell}
                                        <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 400, marginTop: 1 }}>
                                          {[
                                            tr.buyerGbn && `매수 ${tr.buyerGbn}`,
                                            tr.slerGbn  && `매도 ${tr.slerGbn}`,
                                          ].filter(Boolean).join(' · ')}
                                        </div>
                                        {(tr.dealingGbn || tr.agentSgg) && (
                                          <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 400 }}>
                                            {tr.dealingGbn === '직거래'
                                              ? <span style={{ color: '#dc2626' }}>직거래</span>
                                              : tr.dealingGbn}
                                            {tr.agentSgg ? ` · ${tr.agentSgg}` : ''}
                                          </div>
                                        )}
                                      </td>
                                      {status && (
                                        <td style={{ padding: '5px 0', textAlign: 'right', verticalAlign: 'top' }}>
                                          <span style={{
                                            fontSize: 10, fontWeight: 700, padding: '2px 5px', borderRadius: 6,
                                            background: status.bg, color: status.color, whiteSpace: 'nowrap',
                                          }}>{status.label}</span>
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </div>
                      );
                    })()}

                    {/* 교통 */}
                    {transit.length > 0 && (
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>교통</div>
                        {transit.slice(0, 4).map((s, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}>
                            <span style={{ color: '#374151' }}>🚇 {s.name}</span>
                            <span style={{ color: '#9ca3af' }}>{s.distance}m</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 학교 */}
                    {schools.length > 0 && (
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>학교</div>
                        {schools.slice(0, 4).map((s, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}>
                            <span style={{ color: '#374151' }}>🏫 {s.name}</span>
                            <span style={{ color: '#9ca3af' }}>{s.distance}m</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 인프라 */}
                    {infra.length > 0 && (
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>주변 인프라</div>
                        {infra.slice(0, 6).map((s, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}>
                            <span style={{ color: '#374151' }}>📍 {s.name}</span>
                            <span style={{ color: '#9ca3af' }}>{s.distance}m</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* 상세 페이지 링크 */}
                <div style={{ padding: '16px' }}>
                  <Link href={`/complex/${encodeURIComponent(selectedComplex.slug)}`}
                    style={{
                      display: 'block', textAlign: 'center', padding: '12px 0',
                      background: COMPLEX_COLOR, color: '#fff', borderRadius: 10,
                      textDecoration: 'none', fontSize: 14, fontWeight: 700,
                    }}>
                    단지 상세 정보 →
                  </Link>
                </div>
              </div>
            </div>
            <style>{`@keyframes slideInLeft { from { transform: translateX(-100%) } to { transform: translateX(0) } }`}</style>
          </>
        );
      })()}

      {/* 선택된 매물 카드 */}
      {selected && (
        <>
          <div style={{
            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            width: 'min(380px, calc(100vw - 32px))',
            background: '#fff', borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            zIndex: 20, overflow: 'hidden',
          }}>
            <div style={{
              background: selected.type === 'unsold' ? UNSOLD_COLOR : SALE_COLOR,
              padding: '10px 16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
                {selected.type === 'unsold' ? '미분양 매물' : `청약 · ${(selected.item as MapSaleItem).status}`}
              </span>
              <button
                onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: 0 }}
              >✕</button>
            </div>

            <div style={{ padding: '14px 16px' }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 6px', lineHeight: 1.3 }}>
                {selected.item.name}
              </p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 10px' }}>
                📍 {selected.item.location}
              </p>

              {selected.type === 'unsold' && (() => {
                const i = selected.item as MapUnsoldItem;
                return (
                  <>
                    {(i.min_price || i.max_price) && (
                      <p style={{ fontSize: 13, fontWeight: 700, color: UNSOLD_COLOR, margin: '0 0 6px' }}>
                        {i.min_price && i.max_price
                          ? `${fmt(i.min_price)} ~ ${fmt(i.max_price)}`
                          : fmt((i.min_price ?? i.max_price)!)}
                      </p>
                    )}
                    {i.benefit && (
                      <p style={{ fontSize: 12, color: '#059669', margin: '0 0 6px', fontWeight: 600 }}>
                        🎁 {i.benefit}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <Link
                        href={`/unsold/${i.slug ?? i.id}`}
                        style={{
                          flex: 1, display: 'block', textAlign: 'center', padding: '9px 0',
                          background: UNSOLD_COLOR, color: '#fff', borderRadius: 8,
                          textDecoration: 'none', fontSize: 13, fontWeight: 700,
                        }}
                      >
                        매물 상세보기 →
                      </Link>
                      <Link
                        href={`/complex/${encodeURIComponent(locationToSlug(i.location, i.name))}`}
                        style={{
                          flex: 1, display: 'block', textAlign: 'center', padding: '9px 0',
                          background: '#f0fdf4', color: '#16a34a', borderRadius: 8,
                          textDecoration: 'none', fontSize: 13, fontWeight: 700, border: '1px solid #bbf7d0',
                        }}
                      >
                        단지 시세 →
                      </Link>
                    </div>
                  </>
                );
              })()}

              {selected.type === 'sale' && (() => {
                const i = selected.item as MapSaleItem;
                return (
                  <>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                        background: i.status === '청약중' ? '#dcfce7' : '#fef3c7',
                        color: i.status === '청약중' ? '#166534' : '#92400e',
                      }}>
                        {i.status}
                      </span>
                      {i.buildingType && <span style={{ fontSize: 11, color: '#6b7280', alignSelf: 'center' }}>{i.buildingType}</span>}
                      {i.totalUnits > 0 && <span style={{ fontSize: 11, color: '#6b7280', alignSelf: 'center' }}>총 {i.totalUnits.toLocaleString()}세대</span>}
                    </div>
                    {i.receiptStart && (
                      <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 10px' }}>
                        청약 {i.receiptStart} ~ {i.receiptEnd}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <Link
                        href={`/sale/${i.houseManageNo}`}
                        style={{
                          flex: 1, display: 'block', textAlign: 'center', padding: '9px 0',
                          background: SALE_COLOR, color: '#fff', borderRadius: 8,
                          textDecoration: 'none', fontSize: 13, fontWeight: 700,
                        }}
                      >
                        청약 상세보기 →
                      </Link>
                      <Link
                        href={`/complex/${encodeURIComponent(locationToSlug(i.location, i.name))}`}
                        style={{
                          flex: 1, display: 'block', textAlign: 'center', padding: '9px 0',
                          background: '#f0fdf4', color: '#16a34a', borderRadius: 8,
                          textDecoration: 'none', fontSize: 13, fontWeight: 700, border: '1px solid #bbf7d0',
                        }}
                      >
                        단지 시세 →
                      </Link>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </>
      )}

      {/* 동별 시세 패널 */}
      {(dongLoading || dongPanel) && (() => {
        const mobile = typeof window !== 'undefined' && window.innerWidth < 500;
        return (
        <div style={mobile ? {
          position: 'absolute', bottom: 0, left: 0, right: 0,
          maxHeight: '55dvh', background: '#fff',
          borderRadius: '16px 16px 0 0',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
          zIndex: 20, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        } : {
          position: 'absolute', top: 72, right: 12,
          width: 'min(280px, calc(100vw - 24px))',
          maxHeight: 'calc(100dvh - 140px)',
          background: '#fff', borderRadius: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          zIndex: 20, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* 헤더 */}
          <div style={{
            background: '#7c3aed', padding: '10px 14px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
              💰 {dongPanel?.districtName ?? '…'} 읍·면·동별 시세
            </span>
            <button
              onClick={() => setDongPanel(null)}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: 0 }}
            >✕</button>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {dongLoading ? (
              <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: '24px 0' }}>불러오는 중…</p>
            ) : !dongPanel || dongPanel.dongs.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: '24px 0' }}>데이터가 없습니다</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f8f5ff', borderBottom: '1px solid #ede9fe' }}>
                    <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 700, color: '#5b21b6' }}>읍·면·동</th>
                    <th style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, color: '#5b21b6' }}>전용㎡당</th>
                    <th style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, color: '#5b21b6', whiteSpace: 'nowrap' }}>거래</th>
                  </tr>
                </thead>
                <tbody>
                  {dongPanel.dongs
                    .map(d => ({ d, stats: d[ageTab] }))
                    .filter(({ stats }) => stats.count > 0)
                    .sort((a, b) => b.stats.avgPerM2 - a.stats.avgPerM2)
                    .map(({ d, stats }, i) => (
                      <tr key={d.dong} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '6px 12px', color: '#374151', fontWeight: 600 }}>{d.dong}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: '#7c3aed', fontWeight: 700 }}>
                          {fmtW(stats.avgPerM2)}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: '#9ca3af' }}>
                          {stats.count}건
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ padding: '6px 12px', borderTop: '1px solid #f3f4f6', fontSize: 10, color: '#9ca3af', flexShrink: 0 }}>
            최근 3개월 실거래 · 2건 미만 제외 · 전용면적 가중평균
          </div>
        </div>
        );
      })()}

      {/* 우측 하단 범례 */}
      <div style={{
        position: 'absolute', bottom: 16, right: 16,
        background: 'rgba(255,255,255,0.95)', borderRadius: 10,
        padding: '8px 12px', boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
        zIndex: 10, fontSize: 11, color: '#374151',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: UNSOLD_COLOR, display: 'inline-block', flexShrink: 0 }} />
          미분양 매물
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: priceMode ? 8 : 0 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: SALE_COLOR, display: 'inline-block', flexShrink: 0 }} />
          청약 단지
        </div>
        {priceMode && (
          <>
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 8, marginBottom: 4, fontWeight: 700, color: '#7c3aed', fontSize: 10 }}>
              💰 실거래 평균가
            </div>
            {PRICE_TIERS.map(t => (
              <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: t.bg, border: `1px solid ${t.border}`, display: 'inline-block', flexShrink: 0 }} />
                {t.label}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
