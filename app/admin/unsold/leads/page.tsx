'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { UnsoldLead } from '@/lib/supabase';

function fmtDate(s: string) {
  const d = new Date(s);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<UnsoldLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/unsold/leads')
      .then(r => { if (r.status === 401) { router.push('/admin'); return null; } return r.json(); })
      .then(data => { if (data) { setLeads(data); setLoading(false); } });
  }, [router]);

  const filtered = leads.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.name.includes(search) || l.phone.includes(search) ||
      (l.unsold_listings?.name ?? '').toLowerCase().includes(q);
  });

  // 아파트별 그룹핑
  const grouped = filtered.reduce<Record<string, { aptName: string; leads: UnsoldLead[] }>>((acc, l) => {
    const key = l.unsold_id;
    if (!acc[key]) acc[key] = { aptName: l.unsold_listings?.name ?? l.unsold_id, leads: [] };
    acc[key].leads.push(l);
    return acc;
  }, {});

  const handleDelete = async (id: string) => {
    if (!confirm('이 리드를 삭제하시겠습니까?')) return;
    const res = await fetch(`/api/unsold/leads?id=${id}`, { method: 'DELETE' });
    if (res.ok) setLeads(prev => prev.filter(l => l.id !== id));
    else alert('삭제 실패');
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ background: '#1e293b', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/admin" style={{ color: '#fff', fontWeight: 800, fontSize: 16, textDecoration: 'none' }}>🏠 관리자</Link>
          <Link href="/admin/unsold" style={{ color: '#94a3b8', fontSize: 14, textDecoration: 'none' }}>미분양 매물</Link>
          <span style={{ color: '#60a5fa', fontSize: 14, fontWeight: 700 }}>관심 고객 리드</span>
        </div>
        <button onClick={handleLogout} style={{ fontSize: 13, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>로그아웃</button>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0 }}>관심 고객 리드</h1>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>총 {leads.length}건</p>
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="이름·전화번호·단지명 검색"
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, width: 220 }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>불러오는 중...</div>
        ) : leads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>등록된 리드가 없습니다.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {Object.entries(grouped).map(([unsoldId, { aptName, leads: aptLeads }]) => (
              <div key={unsoldId} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                {/* 단지 헤더 */}
                <div style={{
                  background: '#eff6ff', padding: '12px 20px',
                  borderBottom: '1px solid #dbeafe',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#1d4ed8' }}>{aptName}</span>
                    <span style={{ fontSize: 12, background: '#1d4ed8', color: '#fff', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                      {aptLeads.length}건
                    </span>
                  </div>
                  <Link
                    href={`/unsold/${unsoldId}`}
                    target="_blank"
                    style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}
                  >
                    매물 보기 →
                  </Link>
                </div>

                {/* 리드 목록 */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['이름', '전화번호', '등록일시', ''].map(h => (
                        <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #f3f4f6' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {aptLeads.map((lead, i) => (
                      <tr key={lead.id} style={{ borderBottom: i < aptLeads.length - 1 ? '1px solid #f3f4f6' : 'none', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 600, color: '#1e293b' }}>{lead.name}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <a href={`tel:${lead.phone}`} style={{ color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}>{lead.phone}</a>
                        </td>
                        <td style={{ padding: '10px 16px', color: '#9ca3af' }}>{fmtDate(lead.created_at)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleDelete(lead.id)}
                            style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#fef2f2', color: '#dc2626', fontSize: 12, cursor: 'pointer' }}
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
