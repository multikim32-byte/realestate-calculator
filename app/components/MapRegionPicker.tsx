'use client';

import { useEffect, useRef, useState } from 'react';
import { LAWD_CODE_MAP } from '@/lib/tradeApi';

export interface SelectedRegion {
  sido: string;
  sigunguName: string;
  lawdCd: string;
}

interface Props {
  onSelect: (region: SelectedRegion) => void;
  onClose: () => void;
}

// 카카오 API 반환 시/도명 → LAWD_CODE_MAP 키
const SIDO_MAP: Record<string, string> = {
  '서울특별시': '서울',
  '경기도': '경기',
  '인천광역시': '인천',
  '부산광역시': '부산',
  '대구광역시': '대구',
  '광주광역시': '광주',
  '대전광역시': '대전',
  '울산광역시': '울산',
  '세종특별자치시': '세종',
  '강원특별자치도': '강원',
  '강원도': '강원',
  '충청북도': '충북',
  '충청남도': '충남',
  '전북특별자치도': '전북',
  '전라북도': '전북',
  '전라남도': '전남',
  '경상북도': '경북',
  '경상남도': '경남',
  '제주특별자치도': '제주',
};

function findSigungu(sido: string, regionName: string): { name: string; code: string } | null {
  const districts = LAWD_CODE_MAP[sido as keyof typeof LAWD_CODE_MAP];
  if (!districts) return null;

  // 1) 직접 매칭
  const direct = (districts as readonly { name: string; code: string }[]).find(d => d.name === regionName);
  if (direct) return direct;

  // 2) "수원시 영통구" → "수원 영통구"
  const normalized = regionName.replace(/([가-힣]+)시\s+/, '$1 ').replace(/([가-힣]+)군\s+/, '$1 ');
  const byNorm = (districts as readonly { name: string; code: string }[]).find(d => d.name === normalized);
  if (byNorm) return byNorm;

  // 3) 도시명만 추출해서 prefix 매칭 ("수원시" → "수원 *")
  const cityOnly = regionName.replace(/시$|군$|구$/, '').trim();
  const byPrefix = (districts as readonly { name: string; code: string }[]).find(d =>
    d.name.startsWith(cityOnly + ' ') || d.name === cityOnly
  );
  if (byPrefix) return byPrefix;

  // 4) 부분 포함 (마지막 수단)
  const partial = (districts as readonly { name: string; code: string }[]).find(d =>
    d.name.includes(cityOnly) || cityOnly.includes(d.name.split(' ')[0])
  );
  return partial ?? null;
}

export default function MapRegionPicker({ onSelect, onClose }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [found, setFound] = useState<SelectedRegion | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [clicking, setClicking] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

  useEffect(() => {
    if (!apiKey || !mapRef.current) return;

    function initMap() {
      if (!mapRef.current || mapInstance.current) return;

      const map = new window.kakao.maps.Map(mapRef.current, {
        center: new window.kakao.maps.LatLng(36.5, 127.8),
        level: 13,
      });
      mapInstance.current = map;

      const geocoder = new window.kakao.maps.services.Geocoder();

      window.kakao.maps.event.addListener(map, 'click', (e: any) => {
        const lat = e.latLng.getLat();
        const lng = e.latLng.getLng();

        setFound(null);
        setNotFound(false);
        setClicking(true);

        // 기존 마커 제거
        if (markerRef.current) {
          markerRef.current.setMap(null);
          markerRef.current = null;
        }

        geocoder.coord2RegionCode(lng, lat, (result: any, status: any) => {
          setClicking(false);
          if (status !== window.kakao.maps.services.Status.OK || !result.length) {
            setNotFound(true);
            return;
          }

          // 법정구역(H) 우선
          const region = result.find((r: any) => r.region_type === 'H') ?? result[0];
          const sido = SIDO_MAP[region.region_1depth_name];

          if (!sido) { setNotFound(true); return; }

          const sigungu = findSigungu(sido, region.region_2depth_name);
          if (!sigungu) { setNotFound(true); return; }

          // 선택 마커 표시
          const marker = new window.kakao.maps.Marker({
            map,
            position: e.latLng,
          });
          markerRef.current = marker;

          setFound({ sido, sigunguName: sigungu.name, lawdCd: sigungu.code });
        });
      });
    }

    const scriptId = 'kakao-map-sdk';
    if (document.getElementById(scriptId)) {
      if (window.kakao?.maps?.Map) initMap();
      else window.kakao?.maps?.load?.(initMap);
      return;
    }
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services&autoload=false`;
    script.onload = () => window.kakao.maps.load(initMap);
    document.head.appendChild(script);
  }, [apiKey]);

  if (!apiKey) return null;

  return (
    <div style={{ borderRadius: 16, border: '2px solid #1d4ed8', overflow: 'hidden', marginBottom: 20 }}>
      {/* 헤더 */}
      <div style={{
        padding: '12px 16px', background: '#1e293b',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>🗺️ 지도에서 지역 선택</span>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>원하는 시·군·구를 클릭하세요</span>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: '#94a3b8',
          fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 4px',
        }}>✕</button>
      </div>

      {/* 지도 */}
      <div style={{ position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: 400 }} />

        {/* 클릭 중 로딩 */}
        {clicking && (
          <div style={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            background: '#fff', borderRadius: 12, padding: '10px 20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)', fontSize: 13, color: '#6b7280',
            zIndex: 10, whiteSpace: 'nowrap',
          }}>
            지역 확인 중...
          </div>
        )}

        {/* 결과 오버레이 */}
        {!clicking && (found || notFound) && (
          <div style={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            background: '#fff', borderRadius: 12, padding: '12px 20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', gap: 12,
            zIndex: 10, whiteSpace: 'nowrap',
          }}>
            {found ? (
              <>
                <span style={{ fontSize: 14, color: '#1e293b', fontWeight: 700 }}>
                  📍 {found.sido} {found.sigunguName}
                </span>
                <button
                  onClick={() => onSelect(found)}
                  style={{
                    padding: '8px 18px', borderRadius: 8, border: 'none',
                    background: '#1d4ed8', color: '#fff',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  이 지역 조회 →
                </button>
              </>
            ) : (
              <span style={{ fontSize: 13, color: '#9ca3af' }}>
                ⚠️ 지원하지 않는 지역입니다. 다른 곳을 클릭해보세요.
              </span>
            )}
          </div>
        )}

        {/* 초기 안내 */}
        {!clicking && !found && !notFound && (
          <div style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(30,41,59,0.75)', borderRadius: 20, padding: '6px 16px',
            fontSize: 12, color: '#fff', zIndex: 10, whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}>
            지도를 스크롤로 확대 후 클릭하세요
          </div>
        )}
      </div>
    </div>
  );
}
