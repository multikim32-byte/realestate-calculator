'use client';

function getApplyhomeUrl(buildingType?: string, recruitType?: string) {
  if (recruitType === '선착순') {
    return 'https://www.applyhome.co.kr/ai/aia/selectAPTRemndrLttotPblancListView.do';
  }
  if (!buildingType) return 'https://www.applyhome.co.kr/ai/aia/selectAPTLttotPblancListView.do';
  const t = buildingType.trim();
  if (t.includes('오피스텔') || t.includes('도시형') || t.includes('민간임대') || t.includes('생활주택')) {
    return 'https://www.applyhome.co.kr/ai/aia/selectOtherLttotPblancListView.do';
  }
  return 'https://www.applyhome.co.kr/ai/aia/selectAPTLttotPblancListView.do';
}

interface Props {
  houseManageNo: string;
  pblancNo: string;
  status: string;
  buildingType?: string;
  recruitType?: string;
}

export default function CompetitionRateSection({ buildingType, recruitType }: Props) {
  return (
    <div style={{ marginTop: 16 }}>
      <a
        href={getApplyhomeUrl(buildingType, recruitType)}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '12px 24px', borderRadius: 10, fontWeight: 700, fontSize: 14,
          background: '#fff', color: '#374151', textDecoration: 'none',
          border: '1px solid #d1d5db', cursor: 'pointer',
        }}
      >
        🏆 신청현황 · 경쟁률 확인 (청약홈)
      </a>
    </div>
  );
}
