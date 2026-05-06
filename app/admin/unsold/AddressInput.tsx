'use client';

import { useEffect, useState } from 'react';

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
}

export default function AddressInput({ value, onChange }: Props) {
  const [base, setBase] = useState(value);
  const [detail, setDetail] = useState('');
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // 외부 값 변경 반영 (불러오기 시) — 시도+시군구는 기본주소, 나머지는 상세주소로 분리
  useEffect(() => {
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
        // 시도·시군구를 Daum 단축명으로 교체해 필터와 호환되도록 구성
        // Daum roadAddress는 "경기도 양주시 ..." 형태이므로 앞 두 토큰을 교체
        const parts = full.trim().split(/\s+/);
        const rest = parts.slice(2).join(' ');
        const normalized = [data.sido, data.sigungu, rest].filter(Boolean).join(' ');
        setBase(normalized);
        setDetail('');
        onChange(normalized);
      },
    }).open();
  };

  const handleDetailChange = (val: string) => {
    setDetail(val);
    onChange(val ? `${base} ${val}`.trim() : base);
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
