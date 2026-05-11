'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { MapUnsoldItem, MapSaleItem } from './page';

interface Props {
  unsoldListings: MapUnsoldItem[];
  saleListings: MapSaleItem[];
}

type PinType = 'unsold' | 'sale';

interface PinInfo {
  type: PinType;
  item: MapUnsoldItem | MapSaleItem;
}

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
const UNSOLD_COLOR = '#1d4ed8';
const SALE_COLOR   = '#059669';

function fmt(v: number) {
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
  if (v >= 10000) return `${Math.floor(v / 10000).toLocaleString()}만`;
  return `${v.toLocaleString()}원`;
}

function geocodeWithCache(
  geocoder: any,
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  return new Promise(resolve => {
    const key = `gc2:${address}`;
    try {
      const hit = localStorage.getItem(key);
      if (hit) { resolve(JSON.parse(hit)); return; }
    } catch { /* ignore */ }

    geocoder.addressSearch(address, (result: any[], status: string) => {
      if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
        const coords = { lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) };
        try { localStorage.setItem(key, JSON.stringify(coords)); } catch { /* ignore */ }
        resolve(coords);
      } else {
        resolve(null);
      }
    });
  });
}

function makeMarkerSvg(color: string, size = 22) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${color}" stroke="white" stroke-width="2.5"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function MapClient({ unsoldListings, saleListings }: Props) {
  const mapRef      = useRef<HTMLDivElement>(null);
  const mapInst     = useRef<any>(null);
  const markersRef  = useRef<{ m: any; type: PinType }[]>([]);
  const [filter, setFilter]   = useState({ unsold: true, sale: true });
  const filterRef   = useRef({ unsold: true, sale: true });
  const [progress, setProgress] = useState({ done: 0, total: 0, ready: false });
  const [selected, setSelected] = useState<PinInfo | null>(null);

  // 필터 변경 → 마커 표시/숨김
  function applyFilter(next: typeof filter) {
    filterRef.current = next;
    setFilter(next);
    markersRef.current.forEach(({ m, type }) => {
      const show = (type === 'unsold' && next.unsold) || (type === 'sale' && next.sale);
      m.setVisible(show);
    });
  }

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

      const allPins: { address: string; type: PinType; item: MapUnsoldItem | MapSaleItem }[] = [
        ...unsoldListings.map(i => ({ address: i.location, type: 'unsold' as PinType, item: i })),
        ...saleListings.map(i => ({ address: i.location, type: 'sale' as PinType, item: i })),
      ];

      setProgress({ done: 0, total: allPins.length, ready: false });

      (async () => {
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

        for (const pin of allPins) {
          const coords = await geocodeWithCache(geocoder, pin.address);

          if (coords) {
            const marker = new window.kakao.maps.Marker({
              position: new window.kakao.maps.LatLng(coords.lat, coords.lng),
              image: pin.type === 'unsold' ? unsoldImg : saleImg,
              map,
              title: (pin.item as any).name,
            });

            window.kakao.maps.event.addListener(marker, 'click', () => {
              setSelected({ type: pin.type, item: pin.item });
              map.panTo(new window.kakao.maps.LatLng(coords.lat, coords.lng));
            });

            markersRef.current.push({ m: marker, type: pin.type });
          }

          setProgress(p => ({ ...p, done: p.done + 1 }));
          await new Promise(r => setTimeout(r, 30));
        }

        setProgress(p => ({ ...p, ready: true }));
      })();
    }

    const scriptId = 'kakao-map-sdk';
    if (document.getElementById(scriptId)) {
      if (window.kakao?.maps?.Map) initMap();
      else window.kakao?.maps?.load?.(initMap);
      return;
    }
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&libraries=services&autoload=false`;
    script.onload = () => window.kakao.maps.load(initMap);
    document.head.appendChild(script);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const unsoldCount = unsoldListings.length;
  const saleCount = saleListings.length;

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      {/* 지도 */}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* 상단 컨트롤 패널 */}
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

        {/* 미분양 필터 */}
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
          미분양 {unsoldCount}
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
          청약 {saleCount}
        </button>

        {/* 로딩 진행 */}
        {!progress.ready && (
          <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>
            지도 로딩 {pct}%
          </span>
        )}
      </div>

      {/* 선택된 매물 카드 */}
      {selected && (
        <div style={{
          position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          width: 'min(380px, calc(100vw - 32px))',
          background: '#fff', borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          zIndex: 20, overflow: 'hidden',
        }}>
          {/* 카드 헤더 */}
          <div style={{
            background: selected.type === 'unsold' ? UNSOLD_COLOR : SALE_COLOR,
            padding: '10px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5 }}>
              {selected.type === 'unsold' ? '미분양 매물' : `청약 · ${(selected.item as MapSaleItem).status}`}
            </span>
            <button
              onClick={() => setSelected(null)}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: 0 }}
            >
              ✕
            </button>
          </div>

          <div style={{ padding: '14px 16px' }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 6px', lineHeight: 1.3 }}>
              {(selected.item as any).name}
            </p>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 10px' }}>
              📍 {(selected.item as any).location}
            </p>

            {/* 미분양 정보 */}
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
                      display: 'block', textAlign: 'center',
                      marginTop: 10, padding: '9px 0',
                      background: UNSOLD_COLOR, color: '#fff',
                      borderRadius: 8, textDecoration: 'none',
                      fontSize: 13, fontWeight: 700,
                    }}
                  >
                    매물 상세보기 →
                  </Link>
                </>
              );
            })()}

            {/* 청약 정보 */}
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
                    {i.buildingType && (
                      <span style={{ fontSize: 11, color: '#6b7280', alignSelf: 'center' }}>
                        {i.buildingType}
                      </span>
                    )}
                    {i.totalUnits > 0 && (
                      <span style={{ fontSize: 11, color: '#6b7280', alignSelf: 'center' }}>
                        총 {i.totalUnits.toLocaleString()}세대
                      </span>
                    )}
                  </div>
                  {i.receiptStart && (
                    <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 10px' }}>
                      청약 {i.receiptStart} ~ {i.receiptEnd}
                    </p>
                  )}
                  <Link
                    href={`/sale/${i.houseManageNo}`}
                    style={{
                      display: 'block', textAlign: 'center',
                      marginTop: 10, padding: '9px 0',
                      background: SALE_COLOR, color: '#fff',
                      borderRadius: 8, textDecoration: 'none',
                      fontSize: 13, fontWeight: 700,
                    }}
                  >
                    청약 상세보기 →
                  </Link>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* 지도 클릭 시 카드 닫기 */}
      {selected && (
        <div
          style={{ position: 'absolute', inset: 0, zIndex: 5 }}
          onClick={() => setSelected(null)}
        />
      )}

      {/* 우측 하단 범례 */}
      <div style={{
        position: 'absolute', bottom: 16, right: 16,
        background: 'rgba(255,255,255,0.95)', borderRadius: 10,
        padding: '8px 12px', boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
        zIndex: 10, fontSize: 11, color: '#374151',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: UNSOLD_COLOR, display: 'inline-block' }} />
          미분양 매물
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: SALE_COLOR, display: 'inline-block' }} />
          청약 단지
        </div>
      </div>
    </div>
  );
}
