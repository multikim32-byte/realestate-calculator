'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { UnsoldLead } from '@/lib/supabase';

function fmtDate(s: string) {
  const d = new Date(s);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function MemoCell({ lead, onSave }: { lead: UnsoldLead; onSave: (id: string, memo: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(lead.memo ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function save() {
    setSaving(true);
    setSaveError(false);
    const res = await fetch('/api/unsold/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lead.id, memo: value }),
    });
    setSaving(false);
    if (res.ok) { onSave(lead.id, value); setEditing(false); }
    else { setSaveError(true); }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') { setValue(lead.memo ?? ''); setEditing(false); }
  }

  if (editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            ref={inputRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={200}
            placeholder="메모 입력 (Enter 저장)"
            style={{
              flex: 1, padding: '5px 10px', borderRadius: 6,
              border: `1px solid ${saveError ? '#fca5a5' : '#93c5fd'}`, fontSize: 13, outline: 'none',
              minWidth: 0,
            }}
          />
          <button
            onClick={save}
            disabled={saving}
            style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#1d4ed8', color: '#fff', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {saving ? '…' : '저장'}
          </button>
          <button
            onClick={() => { setValue(lead.memo ?? ''); setEditing(false); setSaveError(false); }}
            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12, cursor: 'pointer' }}
          >
            취소
          </button>
        </div>
        {saveError && <span style={{ fontSize: 11, color: '#dc2626' }}>저장 실패. 다시 시도해주세요.</span>}
      </div>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      title="클릭해서 메모 편집"
      style={{
        minWidth: 100, cursor: 'pointer', padding: '4px 8px', borderRadius: 6,
        border: '1px dashed #e5e7eb', fontSize: 13,
        color: value ? '#374151' : '#d1d5db',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220,
      }}
    >
      {value || '메모 추가...'}
    </div>
  );
}

function useToast() {
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };
  return { toast, showToast };
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<UnsoldLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const { toast, showToast } = useToast();

  useEffect(() => {
    fetch('/api/unsold/leads')
      .then(r => { if (r.status === 401) { router.push('/admin'); return null; } return r.json(); })
      .then(data => { if (data) { setLeads(data); setLoading(false); } });
  }, [router]);

  const filtered = leads.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.name.toLowerCase().includes(q) || l.phone.includes(q) ||
      (l.unsold_listings?.name ?? '').toLowerCase().includes(q) ||
      (l.memo ?? '').toLowerCase().includes(q);
  });

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
    else showToast('삭제 실패', false);
  };

  const handleMemoSave = (id: string, memo: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, memo } : l));
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin');
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
          <Link href="/admin/unsold" style={{ color: '#94a3b8', fontSize: 14, textDecoration: 'none' }}>미분양 매물</Link>
          <span style={{ color: '#60a5fa', fontSize: 14, fontWeight: 700 }}>관심 고객 리드</span>
        </div>
        <button onClick={handleLogout} style={{ fontSize: 13, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>로그아웃</button>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0 }}>관심 고객 리드</h1>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>총 {leads.length}건</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="이름·전화번호·단지명·메모 검색"
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, width: 220 }}
            />
            <button
              onClick={() => {
                const rows = [['단지명', '이름', '전화번호', '메모', '등록일시']];
                leads.forEach(l => rows.push([
                  l.unsold_listings?.name ?? l.unsold_id,
                  l.name, l.phone, l.memo ?? '', fmtDate(l.created_at),
                ]));
                const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
                const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `리드_${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
              }}
              style={{
                padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
                background: '#fff', fontSize: 13, cursor: 'pointer', color: '#374151', whiteSpace: 'nowrap',
              }}
            >
              CSV 다운로드
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>불러오는 중...</div>
        ) : leads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>등록된 리드가 없습니다.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {Object.entries(grouped).map(([unsoldId, { aptName, leads: aptLeads }]) => (
              <div key={unsoldId} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
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
                  <Link href={`/unsold/${unsoldId}`} target="_blank" style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}>
                    매물 보기 →
                  </Link>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['이름', '전화번호', '메모', '등록일시', ''].map(h => (
                        <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {aptLeads.map((lead, i) => (
                      <tr key={lead.id} style={{ borderBottom: i < aptLeads.length - 1 ? '1px solid #f3f4f6' : 'none', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>{lead.name}</td>
                        <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                          <a href={`tel:${lead.phone}`} style={{ color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}>{lead.phone}</a>
                        </td>
                        <td style={{ padding: '8px 16px', width: '100%' }}>
                          <MemoCell lead={lead} onSave={handleMemoSave} />
                        </td>
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
