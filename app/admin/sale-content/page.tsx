import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabaseAdmin';
import Link from 'next/link';
import type { SaleContent } from '@/lib/saleContent';

export default async function SaleContentListPage() {
  const cookieStore = await cookies();
  if (cookieStore.get('admin_token')?.value !== process.env.ADMIN_SECRET) {
    redirect('/admin');
  }

  const supabase = createAdminClient();
  const { data: items } = await supabase
    .from('sale_content')
    .select('*')
    .order('updated_at', { ascending: false });

  const list = (items ?? []) as SaleContent[];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* 헤더 */}
      <div style={{ background: '#1e293b', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/admin" style={{ color: '#fff', fontWeight: 800, fontSize: 16, textDecoration: 'none' }}>🏠 관리자</Link>
          <Link href="/admin/unsold" style={{ color: '#94a3b8', fontSize: 14, textDecoration: 'none' }}>미분양 매물</Link>
          <span style={{ color: '#60a5fa', fontSize: 14, fontWeight: 700 }}>청약 콘텐츠</span>
        </div>
        <Link href="/api/admin/logout" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none' }}>로그아웃</Link>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
        {/* 상단 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: '0 0 4px' }}>청약 에디토리얼 콘텐츠</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
              청약홈 API 페이지에 커스텀 설명·이미지를 추가해 SEO를 강화합니다.
            </p>
          </div>
        </div>

        {/* 새 콘텐츠 작성 안내 */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8', margin: '0 0 8px' }}>새 콘텐츠 작성 방법</p>
          <p style={{ fontSize: 13, color: '#374151', margin: '0 0 10px' }}>
            청약홈 API 공고의 houseManageNo를 URL에 입력해 직접 접근하세요.
          </p>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 10px', fontFamily: 'monospace' }}>
            /admin/sale-content/[houseManageNo]
          </p>
          <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>
            청약 상세 페이지 URL (예: <code style={{ background: '#dbeafe', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>mk-land.kr/sale/2026000174</code>)의
            마지막 숫자가 houseManageNo입니다.
          </p>
        </div>

        {/* 목록 */}
        {list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
            <p>아직 작성된 콘텐츠가 없습니다.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {list.map(item => (
              <div key={item.id} style={{
                background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
                padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16,
              }}>
                {item.thumbnail_url && (
                  <img src={item.thumbnail_url} alt=""
                    style={{ width: 80, height: 56, objectFit: 'cover', borderRadius: 8, flexShrink: 0, border: '1px solid #e5e7eb' }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                      background: item.is_published ? '#d1fae5' : '#f3f4f6',
                      color: item.is_published ? '#065f46' : '#6b7280',
                    }}>
                      {item.is_published ? '공개' : '비공개'}
                    </span>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>{item.house_manage_no}</span>
                  </div>
                  {item.summary && (
                    <p style={{ fontSize: 13, color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.summary}
                    </p>
                  )}
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>
                    수정: {new Date(item.updated_at).toLocaleDateString('ko-KR')}
                    {item.pros?.length ? ` · 장점 ${item.pros.length}개` : ''}
                    {item.image_urls?.length ? ` · 이미지 ${item.image_urls.length}장` : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <Link
                    href={`/sale/${item.house_manage_no}`}
                    target="_blank"
                    style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12, color: '#6b7280', textDecoration: 'none' }}
                  >
                    미리보기
                  </Link>
                  <Link
                    href={`/admin/sale-content/${item.house_manage_no}`}
                    style={{ padding: '7px 16px', borderRadius: 8, background: '#1d4ed8', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
                  >
                    수정
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
