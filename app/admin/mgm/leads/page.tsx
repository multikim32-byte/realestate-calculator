'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type MgmLead = {
  id: string;
  house_manage_no: string;
  name: string;
  birth_date: string;
  phone: string;
  address: string;
  created_at: string;
};

function fmtDate(s: string) {
  const d = new Date(s);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function useToast() {
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };
  return { toast, showToast };
}

export default function AdminMgmLeadsPage() {
  const [leads, setLeads] = useState<MgmLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const { toast, showToast } = useToast();

  useEffect(() => {
    fetch('/api/mgm/leads')
      .then(r => { if (r.status === 401) { router.push('/admin'); return null; } return r.json(); })
      .then(data => { if (data) { setLeads(data); setLoading(false); } });
  }, [router]);

  const filtered = leads.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.name.toLowerCase().includes(q) || l.phone.includes(q) ||
      l.address.toLowerCase().includes(q) || l.house_manage_no.includes(q);
  });

  const grouped = filtered.reduce<Record<string, MgmLead[]>>((acc, l) => {
    if (!acc[l.house_manage_no]) acc[l.house_manage_no] = [];
    acc[l.house_manage_no].push(l);
    return acc;
  }, {});

  const handleDelete = async (id: string) => {
    if (!confirm('이 리드를 삭제하시겠습니까?')) return;
    const res = await fetch(`/api/mgm/leads?id=${id}`, { method: 'DELETE' });
    if (res.ok) setLeads(prev => prev.filter(l => l.id !== id));
    else showToast('삭제 실패', false);
  };

  const handleDownloadCSV = () => {
    const rows = [['청약공고번호', '성함', '생년월일', '전화번호', '거주지', '신청일시']];
    leads.forEach(l => rows.push([l.house_manage_no, l.name, l.birth_date, l.phone, l.address, fmtDate(l.created_at)]));
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `MGM리드_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          padding: '12px 20px', borderRadius: 10, fontWeight: 700,
          background: toast.ok ? '#dcfce7' : '#fef2f2',
          color: toast.ok ? '#166534' : '#dc2626',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: 14,
        }}>{toast.msg}</div>
      )}

      <div style={{ background: '#1e293b', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/admin" style={{ color: '#fff', fontWeight: 800, fontSize: 16, textDecoration: 'none' }}>🏠 관리자</Link>
          <Link href="/admin/sale-content" style={{ color: '#94a3b8', fontSize: 14, textDecoration: 'none' }}>청약 콘텐츠</Link>
          <span style={{ color: '#f0abfc', fontSize: 14, fontWeight: 700 }}>MGM 신청 리드</span>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0 }}>MGM 신청 리드</h1>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>총 {leads.length}건</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="이름·전화번호·거주지 검색"
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, width: 220 }}
            />
            <button
              onClick={handleDownloadCSV}
              style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#374151', whiteSpace: 'nowrap' }}
            >
              CSV 다운로드
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>불러오는 중...</div>
        ) : leads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <p style={{ margin: 0 }}>아직 MGM 신청이 없습니다.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {Object.entries(grouped).map(([houseManageNo, groupLeads]) => (
              <div key={houseManageNo} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{
                  background: '#fdf4ff', padding: '12px 20px',
                  borderBottom: '1px solid #e9d5ff',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#7c3aed' }}>공고번호: {houseManageNo}</span>
                    <span style={{ fontSize: 12, background: '#7c3aed', color: '#fff', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                      {groupLeads.length}건
                    </span>
                  </div>
                  <Link href={`/sale/${houseManageNo}`} target="_blank" style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}>
                    청약 상세 →
                  </Link>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['성함', '생년월일', '전화번호', '거주지', '신청일시', ''].map(h => (
                        <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groupLeads.map((lead, i) => (
                      <tr key={lead.id} style={{ borderBottom: i < groupLeads.length - 1 ? '1px solid #f3f4f6' : 'none', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>{lead.name}</td>
                        <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>{lead.birth_date}</td>
                        <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                          <a href={`tel:${lead.phone}`} style={{ color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}>{lead.phone}</a>
                        </td>
                        <td style={{ padding: '10px 16px', color: '#374151' }}>{lead.address}</td>
                        <td style={{ padding: '10px 16px', color: '#9ca3af', whiteSpace: 'nowrap' }}>{fmtDate(lead.created_at)}</td>
                        <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
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
