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

  // 외부 값 변경 반영 (불러오기 시)
  useEffect(() => {
    setBase(value);
    setDetail('');
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
        const addr = data.roadAddress || data.jibunAddress || data.autoJibunAddress;
        setBase(addr);
        setDetail('');
        onChange(addr);
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
