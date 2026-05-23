'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import type { MapUnsoldItem, MapSaleItem } from './page';
import type { DistrictPrice, PriceStats } from '@/app/api/map-prices/route';
import type { DongPrice } from '@/app/api/map-prices/dong/route';

type AgeTab = 'all' | 'y5' | 'y10' | 'y15' | 'y20';
type PriceOverlayItem = { overlay: KakaoCustomOverlay; div: HTMLDivElement; data: DistrictPrice };

interface Props {
  unsoldListings: MapUnsoldItem[];
  saleListings: MapSaleItem[];
}

type PinType = 'unsold' | 'sale';

interface PinInfo {
  type: PinType;
  item: MapUnsoldItem | MapSaleItem;
}

const KAKAO_KEY    = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
const UNSOLD_COLOR = '#1d4ed8';
const SALE_COLOR   = '#059669';
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

export default function MapClient({ unsoldListings, saleListings }: Props) {
  const mapRef     = useRef<HTMLDivElement>(null);
  const mapInst    = useRef<KakaoMapInstance | null>(null);
  const markersRef = useRef<{ m: KakaoMarker; type: PinType }[]>([]);

  const [filter, setFilter]   = useState({ unsold: true, sale: true });
  const filterRef = useRef({ unsold: true, sale: true });

  // 실제 지도에 올라간 마커 수 (geocoding 성공한 것만)
  const [placed, setPlaced]   = useState({ unsold: 0, sale: 0 });
  const [total]               = useState({ unsold: unsoldListings.length, sale: saleListings.length });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PinInfo | null>(null);

  const [priceMode, setPriceMode] = useState(false);
  const [priceLoadState, setPriceLoadState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [ageTab, setAgeTab] = useState<AgeTab>('all');
  const [dongPanel, setDongPanel] = useState<{ districtName: string; code: string; dongs: DongPrice[] } | null>(null);
  const [dongLoading, setDongLoading] = useState(false);
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
    // 라벨도 함께 토글
    pinLabelsRef.current.forEach(({ overlay, type }) => {
      overlay.setMap(next[type] && labelsVisibleRef.current ? mapInst.current : null);
    });
  }

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

  useEffect(() => {
    if (!KAKAO_KEY || !mapRef.current) return;

    function initMap() {
      if (!mapRef.current || mapInst.current) return;

      // 기본: 서울시청 / 접속자 위치 허용 시 해당 위치로 이동
      const map = new window.kakao.maps.Map(mapRef.current, {
        center: new window.kakao.maps.LatLng(37.5665, 126.9780),
        level: 10,
      });
      mapInst.current = map;

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            map.setCenter(new window.kakao.maps.LatLng(coords.latitude, coords.longitude));
            map.setLevel(5);
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
        width: '36px', height: '36px', background: color,
        borderRadius: '50%', color: '#fff', textAlign: 'center',
        lineHeight: '36px', fontWeight: '800', fontSize: '12px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      }];
      unsoldClustererRef.current = new window.kakao.maps.MarkerClusterer({
        map, averageCenter: true, minLevel: 7, styles: clusterStyle(UNSOLD_COLOR),
      });
      saleClustererRef.current = new window.kakao.maps.MarkerClusterer({
        map, averageCenter: true, minLevel: 7, styles: clusterStyle(SALE_COLOR),
      });

      // 지도 이동/줌 시 처리
      window.kakao.maps.event.addListener(map, 'idle', () => {
        const level = map.getLevel();

        // 핀 라벨: 레벨 6 이하에서 단지명·가격 표시
        const showLabels = level <= 6;
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
        const unsoldPins = unsoldListings.map(i => ({ type: 'unsold' as PinType, item: i, address: i.location }));
        const salePins   = saleListings.map(i => ({ type: 'sale' as PinType, item: i, address: i.location }));
        const allPins    = [...unsoldPins, ...salePins];

        // 0패스: DB에 저장된 좌표 있는 미분양 → 즉시 배치 (geocoding 불필요)
        const uncachedPins: typeof allPins = [];
        for (const pin of allPins) {
          const item = pin.item as MapUnsoldItem;
          if (pin.type === 'unsold' && item.lat && item.lng) {
            placeMarker(pin.type, pin.item, { lat: item.lat, lng: item.lng });
            continue;
          }
          // 1패스: localStorage 캐시
          const cacheKey = `gc5:${pin.address}|${pin.item.name}`;
          const coords = getCachedByKey(cacheKey);
          if (coords) placeMarker(pin.type, pin.item, coords);
          else uncachedPins.push(pin);
        }

        // 2패스: 미캐시 항목 병렬 geocoding
        await runParallel(uncachedPins, async pin => {
          const coords = await geocodePin(geocoder, ps, pin.address, pin.item.name, pin.type);
          if (coords) placeMarker(pin.type, pin.item, coords);
        });

        setLoading(false);
      })();
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
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      {/* 지도 */}
      <div ref={mapRef} style={{ width: '100%', height: '100%', touchAction: 'none' }} />

      {/* 상단 컨트롤 */}
      <div style={{
        position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 8, alignItems: 'center',
        background: 'rgba(255,255,255,0.97)', borderRadius: 12,
        padding: '8px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        zIndex: 10, flexWrap: 'wrap', justifyContent: 'center',
        maxWidth: 'calc(100vw - 32px)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}>
          🗺️ 부동산 지도
        </span>
        <div style={{ width: 1, height: 16, background: '#e5e7eb' }} />

        {/* 미분양 필터 — 실제 마커 수 표시 */}
        <button
          onClick={() => applyFilter({ ...filterRef.current, unsold: !filterRef.current.unsold })}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
            background: filter.unsold ? UNSOLD_COLOR : '#f1f5f9',
            color: filter.unsold ? '#fff' : '#64748b',
            fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
          }}
        >
          <span style={{
            display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
            background: filter.unsold ? '#fff' : UNSOLD_COLOR,
          }} />
          미분양 {loading ? `${placed.unsold}/${total.unsold}` : placed.unsold}
        </button>

        {/* 청약 필터 */}
        <button
          onClick={() => applyFilter({ ...filterRef.current, sale: !filterRef.current.sale })}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
            background: filter.sale ? SALE_COLOR : '#f1f5f9',
            color: filter.sale ? '#fff' : '#64748b',
            fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
          }}
        >
          <span style={{
            display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
            background: filter.sale ? '#fff' : SALE_COLOR,
          }} />
          청약 {loading ? `${placed.sale}/${total.sale}` : placed.sale}
        </button>

        <div style={{ width: 1, height: 16, background: '#e5e7eb' }} />

        {/* 시세 오버레이 토글 */}
        <button
          onClick={togglePriceMode}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '9px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
            background: priceMode ? '#7c3aed' : '#f1f5f9',
            color: priceMode ? '#fff' : '#64748b',
            fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
          }}
        >
          💰 시세
          {priceMode && priceLoadState === 'loading' && (
            <span style={{ fontSize: 10, opacity: 0.8 }}>로딩…</span>
          )}
        </button>

        {/* 건축연식 탭 — 시세 모드 ON일 때만 */}
        {priceMode && (
          <>
            <div style={{ width: 1, height: 16, background: '#e5e7eb' }} />
            {AGE_TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => applyAgeTab(key)}
                style={{
                  padding: '4px 10px', borderRadius: 16, border: 'none', cursor: 'pointer',
                  background: ageTab === key ? '#7c3aed' : '#ede9fe',
                  color: ageTab === key ? '#fff' : '#5b21b6',
                  fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                }}
              >
                {label}
              </button>
            ))}
          </>
        )}

        {loading && (
          <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>
            지도 로딩 중…
          </span>
        )}
      </div>

      {/* 선택된 매물 카드 */}
      {selected && (
        <>
          {/* 카드 바깥 클릭 시 닫기 */}
          <div
            style={{ position: 'absolute', inset: 0, zIndex: 15 }}
            onClick={() => setSelected(null)}
          />
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
                    <Link
                      href={`/unsold/${i.slug ?? i.id}`}
                      style={{
                        display: 'block', textAlign: 'center', marginTop: 10, padding: '9px 0',
                        background: UNSOLD_COLOR, color: '#fff', borderRadius: 8,
                        textDecoration: 'none', fontSize: 13, fontWeight: 700,
                      }}
                    >
                      매물 상세보기 →
                    </Link>
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
                    <Link
                      href={`/sale/${i.houseManageNo}`}
                      style={{
                        display: 'block', textAlign: 'center', marginTop: 10, padding: '9px 0',
                        background: SALE_COLOR, color: '#fff', borderRadius: 8,
                        textDecoration: 'none', fontSize: 13, fontWeight: 700,
                      }}
                    >
                      청약 상세보기 →
                    </Link>
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
