'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  address: string;
  name: string;
}

declare global {
  interface Window { kakao: any; }
}

export default function KakaoMap({ address, name }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

  useEffect(() => {
    if (!apiKey || !mapRef.current) return;

    // 주소에서 콤마 이후 제거 (지번 복수 표기 정리)
    const cleanAddress = address.split(',')[0].trim();

    function initMap() {
      try {
        const container = mapRef.current;
        if (!container) return;

        const map = new window.kakao.maps.Map(container, {
          center: new window.kakao.maps.LatLng(37.5665, 126.9780),
          level: 4,
        });

        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.addressSearch(cleanAddress, (result: any, status: any) => {
          if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
            const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);
            map.setCenter(coords);
            const marker = new window.kakao.maps.Marker({ map, position: coords });
            new window.kakao.maps.InfoWindow({
              content: `<div style="padding:8px 12px;font-size:13px;font-weight:700;color:#1d4ed8;white-space:nowrap">${name}</div>`,
            }).open(map, marker);
          } else {
            setError(true);
          }
        });
      } catch (e) {
        setError(true);
      }
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
    script.onerror = () => setError(true);
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
        <div ref={mapRef} style={{ width: '100%', height: 320 }} />
      )}
      <div style={{ padding: '10px 20px', fontSize: 12, color: '#9ca3af' }}>
        {address}
      </div>
    </div>
  );
}
