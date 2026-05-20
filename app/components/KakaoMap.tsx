'use client';

import { useEffect, useRef, useState, startTransition } from 'react';

interface Props {
  address: string;
  name: string;
}

// 지오코딩 결과 캐시 (주소 → 좌표) — 같은 단지 재클릭 시 API 호출 생략
const geocodeCache = new Map<string, { y: string; x: string } | null>();

export default function KakaoMap({ address, name }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<KakaoMapInstance | null>(null);
  const [error, setError] = useState(false);
  const [loadingMap, setLoadingMap] = useState(true);
  const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

  useEffect(() => {
    if (!apiKey || !mapRef.current) return;

    startTransition(() => { setError(false); setLoadingMap(true); });

    // 블록지번 감지: "회천지구 A10-1BL", "계양지구 A9블록", "왕숙2 A-3블록"
    const blockRe = /([가-힣A-Za-z0-9]+)\s+([A-Za-z]{1,3}[-]?\d+(?:-\d+)?[A-Za-z]{0,2}(?:블록|BL))/i;
    const blockInfo = address.match(blockRe);
    const blockKeyword = blockInfo ? `${blockInfo[1]} ${blockInfo[2]}` : '';

    // 괄호·블럭 표기 제거한 순수 주소 (BL + 한글 "블록" 모두 처리)
    const noParens = address
      .replace(/\(.*?\)/g, '')
      .replace(/[A-Z]{1,3}[-]?\d+(-\d+)?[A-Z]{0,2}(?:BL|블록)/gi, '')
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
      const cacheKey = (lotAddress || blockKeyword || cleanAddress) + '|' + name;

      if (geocodeCache.has(cacheKey)) {
        const cached = geocodeCache.get(cacheKey);
        if (cached) { placeMarker(cached); return; }
      }

      const ps = new window.kakao.maps.services.Places();
      const geocoder = new window.kakao.maps.services.Geocoder();
      const searchName = (name ?? '').replace(/\s*\([^)]*\)\s*/g, '').trim();

      // 이름 유사도 — 매칭 없으면 null 반환해 틀린 POI 방지
      function bestMatch(places: KakaoPlaceResult[]): KakaoPlaceResult | null {
        if (!places.length) return null;
        const normalize = (s: string) => s.replace(/\s/g, '').toLowerCase();
        const target = normalize(searchName);
        let best: KakaoPlaceResult | null = null;
        let bestScore = 0;
        for (const p of places) {
          const pn = normalize(p.place_name);
          const score = pn === target ? 100 : (target.includes(pn) || pn.includes(target)) ? 50 : 0;
          if (score > bestScore) { bestScore = score; best = p; }
        }
        return best; // 모두 score 0이면 null
      }

      // 이름 전국 검색 (주소 geocoding 전부 실패 시 최후 수단)
      function nameSearchDirect() {
        if (!searchName) { setError(true); setLoadingMap(false); return; }
        ps.keywordSearch(searchName, (places: KakaoPlaceResult[], st: string) => {
          const hit = st === window.kakao.maps.services.Status.OK ? bestMatch(places) : null;
          if (hit) {
            geocodeCache.set(cacheKey, { y: hit.y, x: hit.x });
            placeMarker({ y: hit.y, x: hit.x });
          } else {
            setError(true); setLoadingMap(false);
          }
        });
      }

      // 중심점 기준 이름 검색: 전국 → 중심 근처 5km → 중심점 그대로
      function searchByNameNearCenter(center: { y: string; x: string }) {
        if (!searchName) { geocodeCache.set(cacheKey, center); placeMarker(center); return; }
        const latLng = new window.kakao.maps.LatLng(center.y, center.x);

        // 1차: 전국 검색 (이름이 고유하면 가장 정확)
        ps.keywordSearch(searchName, (places: KakaoPlaceResult[], st: string) => {
          const hit = st === window.kakao.maps.services.Status.OK ? bestMatch(places) : null;
          if (hit) {
            geocodeCache.set(cacheKey, { y: hit.y, x: hit.x });
            placeMarker({ y: hit.y, x: hit.x });
            return;
          }
          // 2차: 중심 근처 5km (블록지번 등 넓은 개발지구 대응)
          ps.keywordSearch(searchName, (p2: KakaoPlaceResult[], s2: string) => {
            const hit2 = s2 === window.kakao.maps.services.Status.OK ? bestMatch(p2) : null;
            geocodeCache.set(cacheKey, hit2 ? { y: hit2.y, x: hit2.x } : center);
            placeMarker(hit2 ? { y: hit2.y, x: hit2.x } : center);
          }, { location: latLng, radius: 5000 });
        });
      }

      // 주소 목록 순서대로 geocoding → 첫 성공 시 onFound, 전부 실패 시 onFail
      function geocodeCascade(
        addrs: string[],
        onFound: (c: { y: string; x: string }) => void,
        onFail: () => void
      ) {
        const [head, ...tail] = addrs;
        if (!head) { onFail(); return; }
        geocoder.addressSearch(head, (result: KakaoAddressResult[], status: string) => {
          if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
            onFound({ y: result[0].y, x: result[0].x });
          } else {
            geocodeCascade(tail, onFound, onFail);
          }
        });
      }

      const cityAddr = cleanAddress.replace(/\s+[가-힣]+(동|읍|면|리)$/, '').trim();
      const provinceCity = address.match(/^[가-힣]+(특별시|광역시|특별자치시|도)\s*[가-힣]*(시|군|구)/)?.[0] ?? '';
      // 콤마 복수 필지("32-1, 4")는 Kakao geocoder 미지원 → 첫 번째 필지만 사용
      const firstLotAddr = cleanAddress.includes(',') ? cleanAddress.split(',')[0].trim() : cleanAddress;
      const addrList = [firstLotAddr, cleanAddress, cityAddr, provinceCity].filter((a, i, arr) => a && arr.indexOf(a) === i);

      if (lotAddress) {
        // 번지 주소 → 직접 geocoding → 성공 시 마커, 실패 시 이름 검색으로
        geocoder.addressSearch(lotAddress, (result: KakaoAddressResult[], status: string) => {
          if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
            const coords = { y: result[0].y, x: result[0].x };
            geocodeCache.set(cacheKey, coords);
            placeMarker(coords);
          } else {
            geocodeCascade(addrList, searchByNameNearCenter, nameSearchDirect);
          }
        });
      } else {
        // 번지 없음(블록지번 등) → 주소로 중심점 얻어 이름 검색
        // 주소 전부 실패 시 이름 전국 직접 검색
        geocodeCascade(addrList, searchByNameNearCenter, nameSearchDirect);
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

    // 15초 내 initMap 미호출 시 에러 표시
    const timeout = setTimeout(() => { setError(true); setLoadingMap(false); }, 15000);
    const safeInitMap = () => { clearTimeout(timeout); initMap(); };

    const scriptId = 'kakao-map-sdk';
    const existing = document.getElementById(scriptId);
    if (existing) {
      if (window.kakao?.maps?.Map) {
        safeInitMap();
      } else if (window.kakao?.maps?.load) {
        window.kakao.maps.load(safeInitMap);
      } else {
        // 스크립트 태그는 있지만 아직 로드 중 — onload 이벤트 체인에 합류
        existing.addEventListener('load', () => window.kakao.maps.load(safeInitMap), { once: true });
      }
      return () => clearTimeout(timeout);
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services&autoload=false`;
    script.onload = () => window.kakao.maps.load(safeInitMap);
    script.onerror = () => { clearTimeout(timeout); setError(true); setLoadingMap(false); };
    document.head.appendChild(script);
    return () => clearTimeout(timeout);
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
