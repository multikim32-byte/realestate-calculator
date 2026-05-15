import { cookies } from 'next/headers';
import Link from 'next/link';
import LoginForm from './LoginForm';
import AdminHeader from './components/AdminHeader';
import { createClient } from '@supabase/supabase-js';

const MENUS = [
  {
    href: '/admin/sale-schedule',
    emoji: '📋',
    title: '청약 일정 관리',
    desc: '청약홈 API 기준 최근 100건. 메모·추가·삭제·엑셀 다운로드.',
    color: '#f0fdf4', border: '#bbf7d0', titleColor: '#059669',
  },
  {
    href: '/admin/unsold',
    emoji: '🏠',
    title: '미분양 매물 관리',
    desc: '미분양 아파트 매물을 등록·수정·삭제합니다.',
    color: '#eff6ff', border: '#bfdbfe', titleColor: '#1d4ed8',
  },
  {
    href: '/admin/blog',
    emoji: '📝',
    title: '블로그 글 관리',
    desc: '부동산 정보 블로그 글을 작성·수정·삭제합니다. 이미지 자동 최적화(WebP) 지원.',
    color: '#f0fdf4', border: '#bbf7d0', titleColor: '#166534',
  },
  {
    href: '/admin/sale-content',
    emoji: '✍️',
    title: '청약 에디토리얼 콘텐츠',
    desc: '청약홈 API 페이지에 커스텀 설명·이미지를 추가해 SEO를 강화합니다.',
    color: '#f0f9ff', border: '#bae6fd', titleColor: '#0369a1',
  },
  {
    href: '/admin/unsold/leads',
    emoji: '📞',
    title: '관심 고객 리드',
    desc: '미분양 매물 상세페이지에서 이름·전화번호를 남긴 관심 고객 목록을 단지별로 확인합니다.',
    color: '#fff7ed', border: '#fed7aa', titleColor: '#c2410c',
  },
  {
    href: '/admin/push',
    emoji: '🔔',
    title: '푸시 알림 발송',
    desc: '앱 설치 사용자에게 수동으로 푸시 알림을 발송합니다.',
    color: '#fdf4ff', border: '#e9d5ff', titleColor: '#7c3aed',
  },
  {
    href: '/admin/mgm/leads',
    emoji: '🤝',
    title: 'MGM 신청 리드',
    desc: '청약 상세 페이지의 MGM 신청 폼으로 접수된 지인 추천 신청 목록을 확인합니다.',
    color: '#fff1f2', border: '#fecdd3', titleColor: '#be123c',
  },
  {
    href: '/admin/kakao-content',
    emoji: '💛',
    title: '카카오 채널 소식 생성',
    desc: '오늘의 청약·미분양 데이터로 채널 소식 텍스트를 자동 생성합니다. 복사 후 채널 관리자 앱에 붙여넣기.',
    color: '#fefce8', border: '#fef08a', titleColor: '#854d0e',
  },
];

async function getStats() {
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
      { count: totalListings },
      { count: activeListings },
      { count: totalLeads },
      { count: pushSubs },
      { count: mgmLeads },
      { count: thisMonthLeads },
      { count: thisMonthMgm },
      { data: locationRows },
    ] = await Promise.all([
      db.from('unsold_listings').select('*', { count: 'exact', head: true }),
      db.from('unsold_listings').select('*', { count: 'exact', head: true }).eq('is_active', true),
      db.from('unsold_leads').select('*', { count: 'exact', head: true }),
      db.from('push_subscriptions').select('*', { count: 'exact', head: true }),
      db.from('mgm_leads').select('*', { count: 'exact', head: true }),
      db.from('unsold_leads').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
      db.from('mgm_leads').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
      db.from('unsold_listings').select('location').eq('is_active', true),
    ]);

    // 시/도 단위 집계
    const regionMap: Record<string, number> = {};
    for (const row of locationRows ?? []) {
      const sido = (row.location as string)?.trim().split(/\s+/)[0] ?? '기타';
      regionMap[sido] = (regionMap[sido] ?? 0) + 1;
    }
    const topRegions = Object.entries(regionMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { totalListings, activeListings, totalLeads, pushSubs, mgmLeads, thisMonthLeads, thisMonthMgm, topRegions };
  } catch {
    return { totalListings: null, activeListings: null, totalLeads: null, pushSubs: null, mgmLeads: null, thisMonthLeads: null, thisMonthMgm: null, topRegions: [] as [string, number][] };
  }
}

export default async function AdminPage() {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get('admin_token')?.value === process.env.ADMIN_SECRET;

  if (!isAdmin) return <LoginForm />;

  const stats = await getStats();

  const now = new Date();
  const monthLabel = `${now.getMonth() + 1}월`;

  const STATS = [
    { label: '전체 매물', value: stats.totalListings ?? '-', unit: '건', color: '#1d4ed8' },
    { label: '활성 매물', value: stats.activeListings ?? '-', unit: '건', color: '#059669' },
    { label: '관심 고객', value: stats.totalLeads ?? '-', unit: '명', color: '#c2410c' },
    { label: '푸시 구독자', value: stats.pushSubs ?? '-', unit: '명', color: '#7c3aed' },
    { label: 'MGM 신청', value: stats.mgmLeads ?? '-', unit: '건', color: '#be123c' },
  ];

  const MONTHLY = [
    { label: `${monthLabel} 관심고객`, value: stats.thisMonthLeads ?? '-', unit: '명', color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
    { label: `${monthLabel} MGM`, value: stats.thisMonthMgm ?? '-', unit: '건', color: '#be123c', bg: '#fff1f2', border: '#fecdd3' },
  ];

  const maxRegion = (stats.topRegions[0]?.[1] ?? 1) as number;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AdminHeader />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 20px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: '0 0 6px' }}>관리자 대시보드</h1>
        <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 28px' }}>아파트집사 운영 현황</p>

        {/* 전체 지표 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 14 }}>
          {STATS.map(s => (
            <div key={s.label} style={{
              background: '#fff', borderRadius: 12, padding: '20px 18px',
              border: '1px solid #e5e7eb', textAlign: 'center',
            }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: s.color, lineHeight: 1 }}>
                {s.value}<span style={{ fontSize: 14, fontWeight: 600 }}>{s.unit}</span>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* 이번달 리드 + 지역별 분포 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 14, marginBottom: 36 }}>
          {MONTHLY.map(s => (
            <div key={s.label} style={{
              background: s.bg, borderRadius: 12, padding: '20px 18px',
              border: `1px solid ${s.border}`, textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: s.color, marginBottom: 4, letterSpacing: 0.3 }}>
                이번 달
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: s.color, lineHeight: 1 }}>
                {s.value}<span style={{ fontSize: 14, fontWeight: 600 }}>{s.unit}</span>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>{s.label}</div>
            </div>
          ))}

          {/* 지역별 활성 매물 */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 12 }}>지역별 활성 매물</div>
            {stats.topRegions.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>데이터 없음</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {stats.topRegions.map(([sido, cnt]) => (
                  <div key={sido} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#374151', width: 56, flexShrink: 0 }}>{sido}</span>
                    <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden', height: 8 }}>
                      <div style={{ width: `${Math.round((cnt / maxRegion) * 100)}%`, height: '100%', background: '#3b82f6', borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 12, color: '#6b7280', width: 28, textAlign: 'right', flexShrink: 0 }}>{cnt}건</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 메뉴 카드 */}
        <style>{`.admin-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.1); transform: translateY(-2px); }`}</style>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {MENUS.map(m => (
            <Link key={m.href} href={m.href} style={{ textDecoration: 'none' }}>
              <div className="admin-card" style={{
                background: m.color, border: `1px solid ${m.border}`,
                borderRadius: 16, padding: '24px 22px',
                transition: 'box-shadow 0.15s, transform 0.15s', cursor: 'pointer',
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{m.emoji}</div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: m.titleColor, margin: '0 0 6px' }}>{m.title}</h2>
                <p style={{ fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.7 }}>{m.desc}</p>
                <div style={{ marginTop: 14, fontSize: 13, fontWeight: 700, color: m.titleColor }}>관리하기 →</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
