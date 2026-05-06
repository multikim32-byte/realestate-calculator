'use client';

import { LAWD_CODE_MAP } from '@/lib/tradeApi';

const SIDOS = Object.keys(LAWD_CODE_MAP) as Array<keyof typeof LAWD_CODE_MAP>;

interface Props {
  value: string; // "서울 강남구" 형태
  onChange: (value: string) => void;
}

export default function LocationSelector({ value, onChange }: Props) {
  // 완전 controlled — props에서 직접 파생, 내부 state 없음
  const parts = value.trim().split(/\s+/);
  const sido = (SIDOS.find(s => s === parts[0]) ?? SIDOS[0]) as keyof typeof LAWD_CODE_MAP;
  const sigungu = parts.slice(1).join(' ');
  const sigunguList = LAWD_CODE_MAP[sido];

  const handleSidoChange = (s: keyof typeof LAWD_CODE_MAP) => {
    const first = LAWD_CODE_MAP[s][0].name;
    onChange(`${s} ${first}`);
  };

  const handleSigunguChange = (sg: string) => {
    onChange(`${sido} ${sg}`);
  };

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
