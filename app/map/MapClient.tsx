'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import type { MapUnsoldItem, MapSaleItem } from './page';
import type { DistrictPrice } from '@/app/api/map-prices/route';
import { LAWD_CODE_MAP } from '@/lib/tradeApi';

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

// 가격 티어 (단위: 만원)
const PRICE_TIERS = [
  { label: '10억+',     min: 100000, bg: 'rgba(220,38,38,0.88)',  border: '#b91c1c' },
  { label: '6~10억',    min: 60000,  bg: 'rgba(234,88,12,0.88)',   border: '#c2410c' },
  { label: '3~6억',     min: 30000,  bg: 'rgba(202,138,4,0.88)',   border: '#a16207' },
  { label: '1.5~3억',   min: 15000,  bg: 'rgba(22,163,74,0.88)',   border: '#15803d' },
  { label: '1.5억 미만', min: 0,     bg: 'rgba(37,99,235,0.88)',   border: '#1d4ed8' },
] as const;

function priceColor(avgTotal: number) {
  return PRICE_TIERS.find(t => avgTotal >= t.min) ?? PRICE_TIERS[4];
}

function fmtW(v: number): string {
  // v: 만원 단위
  if (v >= 10000) return `${(v / 10000).toFixed(1)}억`;
  return `${Math.round(v / 1000)}천만`;
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

function bestMatch(places: any[], name: string): any | null {
  if (!places.length) return null;
  const norm = (s: string) => s.replace(/\s/g, '').toLowerCase();
  const target = norm(name);
  let best: any = null, bestScore = 0;
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
  geocoder: any,
  ps: any,
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
    geocoder.addressSearch(head, (result: any[], status: string) => {
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
      ps.keywordSearch(searchName, (places: any[], st: string) => {
        if (st === window.kakao.maps.services.Status.OK) {
          const hit = bestMatch(places, searchName);
          if (hit) { res(save({ lat: parseFloat(hit.y), lng: parseFloat(hit.x) })); return; }
        }
        if (center) {
          const latLng = new window.kakao.maps.LatLng(center.lat, center.lng);
          ps.keywordSearch(searchName, (p2: any[], s2: string) => {
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
  const mapInst    = useRef<any>(null);
  const markersRef = useRef<{ m: any; type: PinType }[]>([]);

  const [filter, setFilter]   = useState({ unsold: true, sale: true });
  const filterRef = useRef({ unsold: true, sale: true });

  // 실제 지도에 올라간 마커 수 (geocoding 성공한 것만)
  const [placed, setPlaced]   = useState({ unsold: 0, sale: 0 });
  const [total]               = useState({ unsold: unsoldListings.length, sale: saleListings.length });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PinInfo | null>(null);

  const [priceMode, setPriceMode] = useState(false);
  const [priceLoadState, setPriceLoadState] = useState<'idle' | 'loading' | 'done'>('idle');
  const priceModeRef = useRef(false);
  const priceOverlaysRef = useRef<any[]>([]);
  const loadedSidosRef = useRef(new Set<string>());

  function applyFilter(next: typeof filter) {
    filterRef.current = next;
    setFilter(next);
    markersRef.current.forEach(({ m, type }) => {
      m.setVisible(
        (type === 'unsold' && next.unsold) || (type === 'sale' && next.sale),
      );
    });
  }

  // 시세 오버레이 ON/OFF
  function togglePriceMode() {
    const next = !priceModeRef.current;
    priceModeRef.current = next;
    setPriceMode(next);
    if (!next) {
      priceOverlaysRef.current.forEach(o => o.setMap(null));
      return;
    }
    priceOverlaysRef.current.forEach(o => o.setMap(mapInst.current));
    if (priceLoadState === 'idle') loadAllPrices();
  }

  const loadAllPrices = useCallback(async () => {
    if (!mapInst.current) return;
    setPriceLoadState('loading');

    const geocoder = new window.kakao.maps.services.Geocoder();
    const SIDOS = Object.keys(LAWD_CODE_MAP);

    // 시도별 순차 요청 (서버 부하 분산), 화면에 즉시 반영
    for (const sido of SIDOS) {
      if (loadedSidosRef.current.has(sido)) continue;
      loadedSidosRef.current.add(sido);
      try {
        const res = await fetch(`/api/map-prices?sido=${encodeURIComponent(sido)}`);
        if (!res.ok) continue;
        const data: DistrictPrice[] = await res.json();

        await Promise.all(data.map(async (d) => {
          const cacheKey = `gc-dist:${sido}:${d.code}`;
          let coords = getCachedByKey(cacheKey);
          if (!coords) {
            coords = await new Promise<{ lat: number; lng: number } | null>(resolve => {
              geocoder.addressSearch(`${sido} ${d.name}`, (result: any[], status: string) => {
                if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
                  resolve({ lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) });
                } else resolve(null);
              });
            });
            if (coords) saveCache(cacheKey, coords);
          }
          if (!coords || !mapInst.current) return;

          const color = priceColor(d.avgTotal);
          const label = d.name.split(' ').at(-1) ?? d.name; // 마지막 토큰만 표시
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
          ].join(';');
          div.innerHTML = `${label}<br><span style="font-size:10px;font-weight:600;opacity:0.92">${fmtW(d.avgTotal)}</span>`;
          div.title = `${d.name} · 평균 ${fmtW(d.avgTotal)} (${d.count}건)\n㎡당 ${fmtW(d.avgPerM2)}`;

          const overlay = new window.kakao.maps.CustomOverlay({
            position: new window.kakao.maps.LatLng(coords.lat, coords.lng),
            content: div,
            map: priceModeRef.current ? mapInst.current : null,
            zIndex: 5,
          });
          priceOverlaysRef.current.push(overlay);
        }));
      } catch { /* 개별 시도 실패 무시 */ }
    }

    setPriceLoadState('done');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!KAKAO_KEY || !mapRef.current) return;

    function initMap() {
      if (!mapRef.current || mapInst.current) return;

      const map = new window.kakao.maps.Map(mapRef.current, {
        center: new window.kakao.maps.LatLng(36.5, 127.8),
        level: 13,
      });
      mapInst.current = map;

      const geocoder = new window.kakao.maps.services.Geocoder();
      const ps       = new window.kakao.maps.services.Places();
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
          map,
          title:    (item as any).name,
        });
        window.kakao.maps.event.addListener(marker, 'click', () => {
          setSelected({ type, item });
          map.panTo(new window.kakao.maps.LatLng(coords.lat, coords.lng));
        });
        markersRef.current.push({ m: marker, type });
        setPlaced(p => ({ ...p, [type]: p[type] + 1 }));
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
          const cacheKey = `gc5:${pin.address}|${(pin.item as any).name}`;
          const coords = getCachedByKey(cacheKey);
          if (coords) placeMarker(pin.type, pin.item, coords);
          else uncachedPins.push(pin);
        }

        // 2패스: 미캐시 항목 병렬 geocoding
        await runParallel(uncachedPins, async pin => {
          const coords = await geocodePin(geocoder, ps, pin.address, (pin.item as any).name, pin.type);
          if (coords) placeMarker(pin.type, pin.item, coords);
        });

        setLoading(false);
      })();
    }

    const scriptId = 'kakao-map-sdk';
    if (document.getElementById(scriptId)) {
      if (window.kakao?.maps?.Map) initMap();
      else window.kakao?.maps?.load?.(initMap);
      return;
    }
    const script = document.createElement('script');
    script.id  = scriptId;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&libraries=services&autoload=false`;
    script.onload = () => window.kakao.maps.load(initMap);
    document.head.appendChild(script);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      {/* 지도 */}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

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
            padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
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
            padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
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
            padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
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
                {(selected.item as any).name}
              </p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 10px' }}>
                📍 {(selected.item as any).location}
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
