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

    // 주소 클리닝: 괄호 내용 제거, 개발구역 코드 제거, 번지 이하 제거
    const cleanAddress = address
      .replace(/\(.*?\)/g, '')          // 괄호 내용 제거
      .replace(/[A-Z]{1,3}\d+[A-Z]{0,2}BL/g, '') // AA36BL 같은 블록 코드 제거
      .replace(/\d+번지.*$/g, '')       // "번지 일원" 이하 제거
      .replace(/일원.*$/g, '')          // "일원" 이하 제거
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

      // 단지명 키워드 검색 (위치 바이어스 적용 가능 시 적용)
      function searchByName(center?: { y: string; x: string }) {
        const latLng = center ? new window.kakao.maps.LatLng(center.y, center.x) : undefined;

        // 이름 유사도 점수 (검색결과 중 가장 가까운 이름 선택)
        function bestMatch(places: any[]): any {
          if (places.length === 1) return places[0];
          const normalize = (s: string) => s.replace(/\s/g, '').toLowerCase();
          const target = normalize(name);
          return places.reduce((best: any, p: any) => {
            const pn = normalize(p.place_name);
            const score = pn === target ? 100
              : target.includes(pn) || pn.includes(target) ? 50
              : 0;
            const bestScore = normalize(best.place_name) === target ? 100
              : normalize(best.place_name).includes(target) ? 50 : 0;
            return score > bestScore ? p : best;
          });
        }

        // 1차: AG2(아파트) + 1.5km 반경
        const opts1: any = { category_group_code: 'AG2' };
        if (latLng) { opts1.location = latLng; opts1.radius = 1500; opts1.sort = window.kakao.maps.services.SortBy?.DISTANCE; }

        ps.keywordSearch(name, (places: any, st: any) => {
          if (st === window.kakao.maps.services.Status.OK && places.length > 0) {
            const best = bestMatch(places);
            const coords = { y: best.y, x: best.x };
            geocodeCache.set(cacheKey, coords);
            placeMarker(coords);
            return;
          }
          // 2차: AG2 없으면 카테고리 없이 1.5km
          if (latLng) {
            ps.keywordSearch(name, (p2: any, s2: any) => {
              if (s2 === window.kakao.maps.services.Status.OK && p2.length > 0) {
                const best = bestMatch(p2);
                const coords = { y: best.y, x: best.x };
                geocodeCache.set(cacheKey, coords);
                placeMarker(coords);
              } else {
                // fallback: 동 중심 사용
                geocodeCache.set(cacheKey, center!);
                placeMarker(center!);
              }
            }, { location: latLng, radius: 1500 });
          } else {
            geocodeCache.set(cacheKey, null);
            setError(true);
            setLoadingMap(false);
          }
        }, opts1);
      }

      // 1단계: 동 주소로 대략적 중심 좌표 확보
      geocoder.addressSearch(cleanAddress, (result: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
          const center = { y: result[0].y, x: result[0].x };
          if (name) {
            // 2단계: 중심 좌표 주변에서 아파트명 검색
            searchByName(center);
          } else {
            geocodeCache.set(cacheKey, center);
            placeMarker(center);
          }
        } else {
          // 주소 geocoding 실패 → 위치 바이어스 없이 이름 검색
          if (name) searchByName();
          else { geocodeCache.set(cacheKey, null); setError(true); setLoadingMap(false); }
        }
      });
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
