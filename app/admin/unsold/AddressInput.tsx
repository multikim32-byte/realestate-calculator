'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    daum: {
      Postcode: new (options: { oncomplete: (data: DaumResult) => void; onresize?: (size: { width: number; height: number }) => void }) => { open: () => void };
    };
  }
}

interface DaumResult {
  roadAddress: string;
  jibunAddress: string;
  autoJibunAddress: string;
  sido: string;    // 단축 시도명 예) 서울, 경기, 전북
  sigungu: string; // 시군구명 예) 강남구, 양주시
  bname: string;
  buildingName: string;
  apartment: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onGeocode?: (lat: number, lng: number) => void;
}

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

function loadKakaoMaps(): Promise<void> {
  return new Promise(resolve => {
    if (window.kakao?.maps?.services) { resolve(); return; }
    const existing = document.getElementById('kakao-map-sdk');
    if (existing) {
      window.kakao?.maps?.load?.(resolve);
      return;
    }
    const script = document.createElement('script');
    script.id = 'kakao-map-sdk';
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&libraries=services&autoload=false`;
    script.onload = () => window.kakao.maps.load(resolve);
    document.head.appendChild(script);
  });
}

export default function AddressInput({ value, onChange, onGeocode }: Props) {
  const [base, setBase] = useState(value);
  const [detail, setDetail] = useState('');
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // 마지막으로 내부에서 emit한 값을 추적 — 외부 변경과 내부 타이핑 구분용
  const lastEmitted = useRef(value);

  // 외부 값 변경 반영 (불러오기 시) — 내부 타이핑으로 인한 변경은 무시
  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    const parts = value.trim().split(/\s+/);
    if (parts.length > 2) {
      setBase(parts.slice(0, 2).join(' '));
      setDetail(parts.slice(2).join(' '));
    } else {
      setBase(value);
      setDetail('');
    }
  }, [value]);

  useEffect(() => {
    if (document.querySelector('script[src*="postcode.v2.js"]')) {
      setScriptLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
  }, []);

  const handleSearch = () => {
    if (!scriptLoaded || !window.daum?.Postcode) {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    new window.daum.Postcode({
      oncomplete: (data) => {
        const full = data.roadAddress || data.jibunAddress || data.autoJibunAddress;
        const parts = full.trim().split(/\s+/);
        const rest = parts.slice(2).join(' ');
        const normalized = [data.sido, data.sigungu, rest].filter(Boolean).join(' ');
        setBase(normalized);
        setDetail('');
        onChange(normalized);

        // 좌표 자동 추출 — Kakao 지오코딩 (onGeocode 콜백이 있을 때만)
        if (onGeocode && KAKAO_KEY && full) {
          loadKakaoMaps().then(() => {
            const geocoder = new window.kakao.maps.services.Geocoder();
            geocoder.addressSearch(full, (result: any[], status: string) => {
              if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
                onGeocode(parseFloat(result[0].y), parseFloat(result[0].x));
              }
            });
          });
        }
      },
    }).open();
  };

  const handleDetailChange = (val: string) => {
    setDetail(val);
    const newLocation = val ? `${base} ${val}`.trim() : base;
    lastEmitted.current = newLocation;
    onChange(newLocation);
  };

  const inputStyle: React.CSSProperties = {
    flex: 1, padding: '9px 12px', borderRadius: 8,
    border: '1px solid #d1d5db', fontSize: 14,
    boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          readOnly
          value={base}
          placeholder="우측 버튼으로 주소를 검색하세요"
          style={{ ...inputStyle, background: '#f9fafb', cursor: 'default' }}
        />
        <button
          type="button"
          onClick={handleSearch}
          style={{
            padding: '9px 16px', borderRadius: 8, border: 'none',
            background: '#1d4ed8', color: '#fff', fontSize: 13,
            fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          주소 검색
        </button>
      </div>
      <input
        value={detail}
        onChange={e => handleDetailChange(e.target.value)}
        placeholder="상세 주소 입력 (동·호수·단지명 등, 선택)"
        style={inputStyle}
      />
    </div>
  );
}
