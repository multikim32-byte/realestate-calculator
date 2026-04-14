'use client';

import { useState, useEffect } from 'react';
import { LAWD_CODE_MAP } from '@/lib/tradeApi';

const SIDOS = Object.keys(LAWD_CODE_MAP) as Array<keyof typeof LAWD_CODE_MAP>;

interface Props {
  value: string; // "서울 강남구" 형태
  onChange: (value: string) => void;
}

export default function LocationSelector({ value, onChange }: Props) {
  // 초기값 파싱
  const parts = value.trim().split(/\s+/);
  const initSido = SIDOS.find(s => s === parts[0]) ?? SIDOS[0];
  const initSigungu = parts.slice(1).join(' ') ?? '';

  const [sido, setSido] = useState<keyof typeof LAWD_CODE_MAP>(initSido);
  const [sigungu, setSigungu] = useState(initSigungu);

  const sigunguList = LAWD_CODE_MAP[sido];

  // 시도 변경 시 시군구 첫 번째로 초기화
  const handleSidoChange = (s: keyof typeof LAWD_CODE_MAP) => {
    setSido(s);
    const first = LAWD_CODE_MAP[s][0].name;
    setSigungu(first);
    onChange(`${s} ${first}`);
  };

  const handleSigunguChange = (sg: string) => {
    setSigungu(sg);
    onChange(`${sido} ${sg}`);
  };

  // 외부 value 변경 동기화 (수정 페이지 + 청약정보 불러오기)
  useEffect(() => {
    const p = value.trim().split(/\s+/);
    const s = SIDOS.find(x => x === p[0]);
    if (s) {
      setSido(s);
      setSigungu(p.slice(1).join(' '));
    }
  // value가 바뀔 때마다 드롭다운 동기화
  }, [value]);

  const selectStyle: React.CSSProperties = {
    padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db',
    fontSize: 14, background: '#fff', flex: 1,
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <select value={sido} onChange={e => handleSidoChange(e.target.value as keyof typeof LAWD_CODE_MAP)} style={selectStyle}>
        {SIDOS.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <select value={sigungu} onChange={e => handleSigunguChange(e.target.value)} style={selectStyle}>
        {sigunguList.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
      </select>
    </div>
  );
}
