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

    const cleanAddress = address.split(',')[0].trim();

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
        new window.kakao.maps.InfoWindow({
          content: `<div style="padding:8px 12px;font-size:13px;font-weight:700;color:#1d4ed8;white-space:nowrap">${name}</div>`,
        }).open(mapInstance.current, marker);

        setLoadingMap(false);
      } catch {
        setError(true);
        setLoadingMap(false);
      }
    }

    function geocodeAndPlace() {
      const cacheKey = name || cleanAddress;

      // 캐시 확인
      if (geocodeCache.has(cacheKey)) {
        const cached = geocodeCache.get(cacheKey);
        if (cached) placeMarker(cached);
        else { setError(true); setLoadingMap(false); }
        return;
      }

      const ps = new window.kakao.maps.services.Places();
      const geocoder = new window.kakao.maps.services.Geocoder();

      // 1차: 단지명으로 키워드 검색 → AG2(아파트) 카테고리 우선 선택
      if (name) {
        ps.keywordSearch(name, (places: any, ksStatus: any) => {
          if (ksStatus === window.kakao.maps.services.Status.OK && places.length > 0) {
            // AG2: 아파트 카테고리 우선 선택, 없으면 첫 번째 결과 사용
            const apt = places.find((p: any) => p.category_group_code === 'AG2') ?? places[0];
            const coords = { y: apt.y, x: apt.x };
            geocodeCache.set(cacheKey, coords);
            placeMarker(coords);
          } else {
            // 2차: 주소로 지오코딩
            geocodeByAddress();
          }
        });
      } else {
        geocodeByAddress();
      }

      function geocodeByAddress() {
        geocoder.addressSearch(cleanAddress, (result: any, status: any) => {
          if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
            const coords = { y: result[0].y, x: result[0].x };
            geocodeCache.set(cacheKey, coords);
            placeMarker(coords);
          } else {
            // 3차: 주소 키워드 검색
            ps.keywordSearch(cleanAddress, (places: any, ksStatus: any) => {
              if (ksStatus === window.kakao.maps.services.Status.OK && places.length > 0) {
                const coords = { y: places[0].y, x: places[0].x };
                geocodeCache.set(cacheKey, coords);
                placeMarker(coords);
              } else {
                geocodeCache.set(cacheKey, null);
                setError(true);
                setLoadingMap(false);
              }
            });
          }
        });
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
      if (window.kakao?.maps) initMap();
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
