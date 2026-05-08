import { cookies } from 'next/headers';
import Link from 'next/link';
import LoginForm from './LoginForm';
import { createClient } from '@supabase/supabase-js';

const MENUS = [
  {
    href: '/admin/unsold',
    emoji: '🏠',
    title: '미분양 매물 관리',
    desc: '잔여세대·청약중 매물을 등록·수정·삭제합니다.',
    color: '#eff6ff', border: '#bfdbfe', titleColor: '#1d4ed8',
  },
  {
    href: '/admin/sale-content',
    emoji: '✍️',
    title: '청약 에디토리얼 콘텐츠',
    desc: '청약홈 API 페이지에 커스텀 설명·이미지를 추가해 SEO를 강화합니다.',
    color: '#f0fdf4', border: '#bbf7d0', titleColor: '#166534',
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
];

async function getStats() {
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const [
      { count: totalListings },
      { count: activeListings },
      { count: totalLeads },
      { count: pushSubs },
    ] = await Promise.all([
      db.from('unsold_listings').select('*', { count: 'exact', head: true }),
      db.from('unsold_listings').select('*', { count: 'exact', head: true }).eq('is_active', true),
      db.from('unsold_leads').select('*', { count: 'exact', head: true }),
      db.from('push_subscriptions').select('*', { count: 'exact', head: true }),
    ]);
    return { totalListings, activeListings, totalLeads, pushSubs };
  } catch {
    return { totalListings: null, activeListings: null, totalLeads: null, pushSubs: null };
  }
}

export default async function AdminPage() {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get('admin_token')?.value === process.env.ADMIN_SECRET;

  if (!isAdmin) return <LoginForm />;

  const stats = await getStats();

  const STATS = [
    { label: '전체 매물', value: stats.totalListings ?? '-', unit: '건', color: '#1d4ed8' },
    { label: '활성 매물', value: stats.activeListings ?? '-', unit: '건', color: '#059669' },
    { label: '관심 고객', value: stats.totalLeads ?? '-', unit: '명', color: '#c2410c' },
    { label: '푸시 구독자', value: stats.pushSubs ?? '-', unit: '명', color: '#7c3aed' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ background: '#1e293b', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>🏠 아파트집사 관리자</span>
        <Link href="/api/admin/logout" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none' }}>로그아웃</Link>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 20px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: '0 0 6px' }}>관리자 대시보드</h1>
        <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 28px' }}>아파트집사 운영 현황</p>

        {/* 지표 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 36 }}>
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

        {/* 메뉴 카드 */}
        <style>{`.admin-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.1); transform: translateY(-2px); }`}</style>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
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
