'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  address: string;
  name: string;
}

declare global {
  interface Window { kakao: any; }
}

// 지오코딩 결과 캐시 (주소 → 좌표) — 같은 단지 재클릭 시 API 호출 생략
const geocodeCache = new Map<string, { y: string; x: string } | null>();

export default function KakaoMap({ address, name }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [error, setError] = useState(false);
  const [loadingMap, setLoadingMap] = useState(true);
  const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

  useEffect(() => {
    if (!apiKey || !mapRef.current) return;

    setError(false);
    setLoadingMap(true);

    // 괄호·블럭 표기 제거한 순수 주소
    const noParens = address
      .replace(/\(.*?\)/g, '')
      .replace(/[A-Z]{1,3}\d+[A-Z]{0,2}BL/g, '')
      .trim();

    // 번지 주소 추출 — 콤마가 있으면 첫 번째 필지만 사용
    // "옥정동 962-9, 962-8번지" → "경기도 양주시 옥정동 962-9번지"
    // "광평동 227번지 일원"     → "경상북도 구미시 광평동 227번지"
    let lotAddress = '';
    if (noParens.includes('번지')) {
      const beforeBunji = noParens.split('번지')[0];
      const firstLot = beforeBunji.split(',')[0].trim();
      lotAddress = (firstLot + '번지').replace(/일원.*$/g, '').trim();
    }

    // 동 레벨 주소 — 키워드 검색 실패 시 중심 좌표용
    // "산54-3번지", "962-9, 962-8번지", "227번지 일원" 모두 처리
    const cleanAddress = noParens
      .replace(/\s*(산\s*)?\d[\d\-,\s]*번지.*$/g, '')
      .replace(/일원.*$/g, '')
      .replace(/[,\-\s]+$/g, '')
      .trim();

    function placeMarker(coords: { y: string; x: string }) {
      try {
        const container = mapRef.current;
        if (!container) return;
        const latlng = new window.kakao.maps.LatLng(coords.y, coords.x);

        // 지도 인스턴스 재사용 (새로 생성 X → 이동만)
        if (!mapInstance.current) {
          mapInstance.current = new window.kakao.maps.Map(container, {
            center: latlng,
            level: 4,
          });
        } else {
          mapInstance.current.setCenter(latlng);
          // 기존 마커/인포윈도우 초기화
          mapInstance.current.relayout();
        }

        const marker = new window.kakao.maps.Marker({
          map: mapInstance.current,
          position: latlng,
        });
        const safeName = (name ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        if (safeName) {
          new window.kakao.maps.InfoWindow({
            content: `<div style="padding:8px 12px;font-size:13px;font-weight:700;color:#1d4ed8;white-space:nowrap">${safeName}</div>`,
          }).open(mapInstance.current, marker);
        }

        setLoadingMap(false);
      } catch {
        setError(true);
        setLoadingMap(false);
      }
    }

    function geocodeAndPlace() {
      const cacheKey = (lotAddress || cleanAddress) + '|' + name;

      // 캐시 확인 (성공 좌표만 캐시, 실패는 캐시하지 않아 재시도 허용)
      if (geocodeCache.has(cacheKey)) {
        const cached = geocodeCache.get(cacheKey);
        if (cached) { placeMarker(cached); return; }
      }

      const ps = new window.kakao.maps.services.Places();
      const geocoder = new window.kakao.maps.services.Geocoder();

      const searchName = (name ?? '').replace(/\s*\([^)]*\)\s*/g, '').trim();

      // 아파트명 키워드 검색 → 실패 시 center 근처 검색 → 실패 시 center 그대로
      function searchByNameNearCenter(center: { y: string; x: string }) {
        if (!searchName) { geocodeCache.set(cacheKey, center); placeMarker(center); return; }
        const latLng = new window.kakao.maps.LatLng(center.y, center.x);

        function bestMatch(places: any[]): any {
          if (places.length === 1) return places[0];
          const normalize = (s: string) => s.replace(/\s/g, '').toLowerCase();
          const target = normalize(searchName);
          return places.reduce((best: any, p: any) => {
            const pn = normalize(p.place_name);
            const score = pn === target ? 100 : target.includes(pn) || pn.includes(target) ? 50 : 0;
            const bestScore = normalize(best.place_name) === target ? 100 : normalize(best.place_name).includes(target) ? 50 : 0;
            return score > bestScore ? p : best;
          });
        }

        // 1차: 아파트명 전국 직접 검색 (카테고리 없음 — 단지명이 고유하면 가장 정확)
        ps.keywordSearch(searchName, (places: any, st: any) => {
          if (st === window.kakao.maps.services.Status.OK && places.length > 0) {
            const best = bestMatch(places);
            const coords = { y: best.y, x: best.x };
            geocodeCache.set(cacheKey, coords);
            placeMarker(coords);
            return;
          }
          // 2차: center 근처 2km 검색 (전국 검색 실패 시)
          ps.keywordSearch(searchName, (p2: any, s2: any) => {
            const coords = (s2 === window.kakao.maps.services.Status.OK && p2.length > 0)
              ? { y: bestMatch(p2).y, x: bestMatch(p2).x }
              : center;
            geocodeCache.set(cacheKey, coords);
            placeMarker(coords);
          }, { location: latLng, radius: 2000 });
        });
      }

      // 주소 목록을 순서대로 geocoding, 첫 성공 시 callback 호출
      function geocodeCascade(addrs: string[], onFound: (c: { y: string; x: string }) => void) {
        const [head, ...tail] = addrs;
        if (!head) { setError(true); setLoadingMap(false); return; }
        geocoder.addressSearch(head, (result: any, status: any) => {
          if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
            onFound({ y: result[0].y, x: result[0].x });
          } else {
            geocodeCascade(tail, onFound);
          }
        });
      }

      // 동 레벨 geocoding → 아파트명 키워드 검색 fallback
      function fallbackToNameSearch() {
        // 시도+시군구 추출 (최후 안전망)
        const cityAddr = cleanAddress.replace(/\s+[가-힣]+(동|읍|면|리)$/, '').trim();
        const provinceCity = address.match(/^[가-힣]+(특별시|광역시|특별자치시|도)\s*[가-힣]*(시|군|구)/)?.[0] ?? '';

        const fallbackAddrs = [cleanAddress, cityAddr, provinceCity].filter((a, i, arr) => a && arr.indexOf(a) === i);

        geocodeCascade(fallbackAddrs, (center) => {
          searchByNameNearCenter(center);
        });
      }

      // 1단계: 번지 주소로 정확한 위치 geocoding
      // 성공 시 바로 마커 표시 / 실패 시 아파트명 검색으로 fallback
      if (lotAddress) {
        geocoder.addressSearch(lotAddress, (result: any, status: any) => {
          if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
            const coords = { y: result[0].y, x: result[0].x };
            geocodeCache.set(cacheKey, coords);
            placeMarker(coords);
          } else {
            fallbackToNameSearch();
          }
        });
      } else {
        fallbackToNameSearch();
      }
    }

    function initMap() {
      if (!mapRef.current) return;
      // 지도 컨테이너가 처음이면 초기 지도 생성 후 지오코딩
      if (!mapInstance.current) {
        mapInstance.current = new window.kakao.maps.Map(mapRef.current, {
          center: new window.kakao.maps.LatLng(37.5665, 126.9780),
          level: 4,
        });
      }
      geocodeAndPlace();
    }

    const scriptId = 'kakao-map-sdk';
    if (document.getElementById(scriptId)) {
      // Map 생성자가 있으면 완전히 초기화된 상태
      if (window.kakao?.maps?.Map) initMap();
      else window.kakao?.maps?.load?.(initMap);
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services&autoload=false`;
    script.onload = () => window.kakao.maps.load(initMap);
    script.onerror = () => { setError(true); setLoadingMap(false); };
    document.head.appendChild(script);
  }, [address, name, apiKey]);

  if (!apiKey) return null;

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden', marginTop: 16 }}>
      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #f3f4f6' }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1e293b' }}>📍 단지 위치</h2>
      </div>
      {error ? (
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 14 }}>
          지도를 불러올 수 없습니다.
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {loadingMap && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 1,
              background: '#f3f4f6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, color: '#9ca3af', height: 320,
            }}>
              지도 불러오는 중...
            </div>
          )}
          <div ref={mapRef} style={{ width: '100%', height: 320 }} />
        </div>
      )}
      <div style={{ padding: '10px 20px', fontSize: 12, color: '#9ca3af' }}>
        {address}
      </div>
    </div>
  );
}
