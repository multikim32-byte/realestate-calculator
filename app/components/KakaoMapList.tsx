'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SaleItem } from '@/lib/types';

interface Props { items: SaleItem[] }

interface KakaoGeocoderResult { y: string; x: string }

export default function KakaoMapList({ items }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

  useEffect(() => {
    if (!apiKey || !mapRef.current || items.length === 0) return;

    function initMap() {
      const container = mapRef.current;
      if (!container) return;
      const map = new window.kakao.maps.Map(container, {
        center: new window.kakao.maps.LatLng(36.5, 127.5),
        level: 13,
      });

      const geocoder = new window.kakao.maps.services.Geocoder();
      const bounds = new window.kakao.maps.LatLngBounds();
      let placed = 0;

      // 최대 30개만 지오코딩 (API 부하 방지)
      items.slice(0, 30).forEach((item) => {
        const addr = item.location.split(',')[0].trim();
        geocoder.addressSearch(addr, (result: KakaoGeocoderResult[], status: string) => {
          if (status !== window.kakao.maps.services.Status.OK) return;
          const pos = new window.kakao.maps.LatLng(result[0].y, result[0].x);
          bounds.extend(pos);

          const marker = new window.kakao.maps.Marker({ map, position: pos });
          const info = new window.kakao.maps.InfoWindow({
            content: `<div style="padding:6px 10px;font-size:12px;font-weight:700;color:#1d4ed8;cursor:pointer;white-space:nowrap">${item.name}</div>`,
            removable: true,
          });

          window.kakao.maps.event.addListener(marker, 'click', () => {
            info.open(map, marker);
          });
          window.kakao.maps.event.addListener(marker, 'dblclick', () => {
            try { sessionStorage.setItem(`sale_item_${item.id}`, JSON.stringify(item)); } catch {}
            router.push(`/sale/${item.id}`);
          });

          placed++;
          if (placed === 1) map.setCenter(pos);
          if (placed > 1) map.setBounds(bounds);
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
  }, [items, apiKey, router]);

  if (!apiKey) return null;

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', marginBottom: 16 }}>
      <div style={{ padding: '10px 16px', background: '#f8f9fa', fontSize: 12, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
        📍 최대 30개 단지 표시 · 마커 클릭 → 단지명 · 더블클릭 → 상세보기
      </div>
      <div ref={mapRef} style={{ width: '100%', height: 420 }} />
    </div>
  );
}
