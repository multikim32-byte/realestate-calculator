import Link from 'next/link';

const items = [
  {
    step: '01',
    title: '취득세 확인',
    desc: '주택 수·가격·조정지역 여부에 따라 취득세가 달라집니다. 잔금 전 반드시 확인하세요.',
    href: '/#취득세',
    color: '#f59e0b',
    btnLabel: '취득세 계산하기',
  },
  {
    step: '02',
    title: '대출 상환 계획',
    desc: '잔금 대출 전환 후 월 상환금이 소득의 40%를 넘지 않는지 확인합니다. (DSR 기준)',
    href: '/#대출',
    color: '#2563eb',
    btnLabel: '대출 상환 계산하기',
  },
  {
    step: '03',
    title: '중도금 이자 계산',
    desc: '회차별 납부일부터 잔금일까지 발생하는 이자 총액을 미리 파악해 자금 계획을 세우세요.',
    href: '/#중도금',
    color: '#059669',
    btnLabel: '중도금 이자 계산하기',
  },
  {
    step: '04',
    title: '중개수수료 확인',
    desc: '미분양 직거래도 시행사 지정 중개사를 통하는 경우 수수료가 발생할 수 있습니다.',
    href: '/#중개수수료',
    color: '#7c3aed',
    btnLabel: '중개수수료 계산하기',
  },
  {
    step: '05',
    title: '투자 수익률 계산',
    desc: '취득 비용 전체를 포함해 실질 수익률을 계산하면 투자 판단이 더 명확해집니다.',
    href: '/#수익률',
    color: '#dc2626',
    btnLabel: '수익률 계산하기',
  },
];

export default function ChecklistSection() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {items.map(item => (
        <div
          key={item.step}
          style={{
            display: 'flex', alignItems: 'center', gap: 20,
            background: '#fff', borderRadius: 12,
            border: '1px solid #e5e7eb', padding: '18px 20px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{
            flexShrink: 0, width: 40, height: 40, borderRadius: '50%',
            background: item.color, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800,
          }}>
            {item.step}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1e3a5f', marginBottom: 3 }}>{item.title}</div>
            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{item.desc}</div>
          </div>
          <Link
            href={item.href}
            style={{
              flexShrink: 0, padding: '8px 14px',
              background: item.color, color: '#fff',
              borderRadius: 8, fontSize: 12, fontWeight: 700,
              textDecoration: 'none', whiteSpace: 'nowrap',
            }}
          >
            {item.btnLabel}
          </Link>
        </div>
      ))}
    </div>
  );
}
