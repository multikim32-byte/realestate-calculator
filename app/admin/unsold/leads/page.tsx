'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { UnsoldLead } from '@/lib/supabase';
import AdminHeader from '@/app/admin/components/AdminHeader';
import DeleteModal from '../../components/DeleteModal';

const PAGE_SIZE = 20;

type LeadWithStatus = UnsoldLead & { status?: string };

const STATUS_OPTIONS = [
  { value: 'new',      label: '신규',   bg: '#eff6ff', color: '#1d4ed8' },
  { value: 'calling',  label: '연락중', bg: '#fef9c3', color: '#854d0e' },
  { value: 'done',     label: '완료',   bg: '#dcfce7', color: '#166534' },
];

function fmtDate(s: string) {
  const d = new Date(s);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function StatusBadge({ lead, onChange }: { lead: LeadWithStatus; onChange: (id: string, status: string) => void }) {
  const [open, setOpen] = useState(false);
  const cur = STATUS_OPTIONS.find(s => s.value === (lead.status ?? 'new')) ?? STATUS_OPTIONS[0];
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
          background: cur.bg, color: cur.color, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
        }}
      >{cur.label} ▾</button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 100, marginTop: 4,
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', overflow: 'hidden', minWidth: 90,
        }}>
          {STATUS_OPTIONS.map(s => (
            <button
              key={s.value}
              onClick={() => { onChange(lead.id, s.value); setOpen(false); }}
              style={{
                display: 'block', width: '100%', padding: '8px 14px', border: 'none',
                background: lead.status === s.value ? s.bg : '#fff',
                color: s.color, fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
              }}
            >{s.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function MemoCell({ lead, onSave }: { lead: LeadWithStatus; onSave: (id: string, memo: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(lead.memo ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  async function save() {
    setSaving(true); setSaveError(false);
    const res = await fetch('/api/unsold/leads', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lead.id, memo: value }),
    });
    setSaving(false);
    if (res.ok) { onSave(lead.id, value); setEditing(false); }
    else setSaveError(true);
  }

  if (editing) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input ref={inputRef} value={value} onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setValue(lead.memo ?? ''); setEditing(false); } }}
          maxLength={200} placeholder="메모 입력 (Enter 저장)"
          style={{ flex: 1, padding: '5px 10px', borderRadius: 6, border: `1px solid ${saveError ? '#fca5a5' : '#93c5fd'}`, fontSize: 13, outline: 'none', minWidth: 0 }} />
        <button onClick={save} disabled={saving}
          style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#1d4ed8', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
          {saving ? '…' : '저장'}
        </button>
        <button onClick={() => { setValue(lead.memo ?? ''); setEditing(false); setSaveError(false); }}
          style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12, cursor: 'pointer' }}>취소</button>
      </div>
      {saveError && <span style={{ fontSize: 11, color: '#dc2626' }}>저장 실패. 다시 시도해주세요.</span>}
    </div>
  );

  return (
    <div onClick={() => setEditing(true)} title="클릭해서 메모 편집"
      style={{ minWidth: 100, cursor: 'pointer', padding: '4px 8px', borderRadius: 6, border: '1px dashed #e5e7eb', fontSize: 13, color: value ? '#374151' : '#d1d5db', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
      {value || '메모 추가...'}
    </div>
  );
}

function useToast() {
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const show = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };
  return { toast, show };
}

function getDateRange(filter: string): Date | null {
  const now = new Date();
  if (filter === '오늘') { const d = new Date(now); d.setHours(0,0,0,0); return d; }
  if (filter === '이번주') { const d = new Date(now); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d; }
  if (filter === '이번달') { return new Date(now.getFullYear(), now.getMonth(), 1); }
  return null;
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<LeadWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('전체');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<LeadWithStatus | null>(null);
  const router = useRouter();
  const { toast, show } = useToast();

  useEffect(() => {
    fetch('/api/unsold/leads')
      .then(r => { if (r.status === 401) { router.push('/admin'); return null; } return r.json(); })
      .then(data => { if (data) { setLeads(data); setLoading(false); } });
  }, [router]);

  const filtered = useMemo(() => {
    const since = getDateRange(dateFilter);
    return leads.filter(l => {
      if (since && new Date(l.created_at) < since) return false;
      if (statusFilter !== '전체' && (l.status ?? 'new') !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!l.name.toLowerCase().includes(q) && !l.phone.includes(q) &&
            !(l.unsold_listings?.name ?? '').toLowerCase().includes(q) &&
            !(l.memo ?? '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [leads, search, dateFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const grouped = paged.reduce<Record<string, { aptName: string; leads: LeadWithStatus[] }>>((acc, l) => {
    const key = l.unsold_id;
    if (!acc[key]) acc[key] = { aptName: l.unsold_listings?.name ?? l.unsold_id, leads: [] };
    acc[key].leads.push(l);
    return acc;
  }, {});

  const handleStatusChange = async (id: string, status: string) => {
    const res = await fetch('/api/unsold/leads', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    else show('상태 변경 실패', false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/unsold/leads?id=${deleteTarget.id}`, { method: 'DELETE' });
    if (res.ok) { setLeads(prev => prev.filter(l => l.id !== deleteTarget.id)); show('삭제됐습니다.'); }
    else show('삭제 실패', false);
    setDeleteTarget(null);
  };

  const handleLogout = async () => { await fetch('/api/admin/logout', { method: 'POST' }); router.push('/admin'); };

  const handleCSV = () => {
    const rows = [['단지명', '이름', '전화번호', '상태', '메모', '등록일시']];
    filtered.forEach(l => rows.push([
      l.unsold_listings?.name ?? l.unsold_id, l.name, l.phone,
      STATUS_OPTIONS.find(s => s.value === (l.status ?? 'new'))?.label ?? '신규',
      l.memo ?? '', fmtDate(l.created_at),
    ]));
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `관심고객리드_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  const statusCounts = useMemo(() => leads.reduce<Record<string, number>>((acc, l) => {
    const s = l.status ?? 'new'; acc[s] = (acc[s] ?? 0) + 1; return acc;
  }, {}), [leads]);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: 10, fontWeight: 700, background: toast.ok ? '#dcfce7' : '#fef2f2', color: toast.ok ? '#166534' : '#dc2626', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: 14 }}>{toast.msg}</div>
      )}
      {deleteTarget && (
        <DeleteModal
          title={`"${deleteTarget.name}" 리드 삭제`}
          description="삭제하면 복구할 수 없습니다."
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <AdminHeader />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0 }}>관심 고객 리드</h1>
            <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: '#6b7280' }}>전체 {leads.length}건</span>
              {STATUS_OPTIONS.map(s => (
                <span key={s.value} style={{ fontSize: 12, padding: '2px 8px', borderRadius: 10, background: s.bg, color: s.color, fontWeight: 700 }}>
                  {s.label} {statusCounts[s.value] ?? 0}
                </span>
              ))}
            </div>
          </div>
          <button onClick={handleCSV} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#374151', whiteSpace: 'nowrap' }}>
            CSV 다운로드
          </button>
        </div>

        {/* 필터 영역 */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="이름·전화번호·단지명·메모 검색"
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, width: 220 }} />

          <div style={{ display: 'flex', gap: 6 }}>
            {['전체', '오늘', '이번주', '이번달'].map(f => (
              <button key={f} onClick={() => { setDateFilter(f); setPage(1); }}
                style={{ padding: '6px 12px', borderRadius: 20, border: 'none', fontSize: 12, cursor: 'pointer', background: dateFilter === f ? '#1d4ed8' : '#f1f5f9', color: dateFilter === f ? '#fff' : '#374151', fontWeight: dateFilter === f ? 700 : 400 }}>
                {f}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => { setStatusFilter('전체'); setPage(1); }}
              style={{ padding: '6px 12px', borderRadius: 20, border: 'none', fontSize: 12, cursor: 'pointer', background: statusFilter === '전체' ? '#374151' : '#f1f5f9', color: statusFilter === '전체' ? '#fff' : '#374151', fontWeight: statusFilter === '전체' ? 700 : 400 }}>전체</button>
            {STATUS_OPTIONS.map(s => (
              <button key={s.value} onClick={() => { setStatusFilter(s.value); setPage(1); }}
                style={{ padding: '6px 12px', borderRadius: 20, border: 'none', fontSize: 12, cursor: 'pointer', background: statusFilter === s.value ? s.color : '#f1f5f9', color: statusFilter === s.value ? '#fff' : '#374151', fontWeight: statusFilter === s.value ? 700 : 400 }}>
                {s.label}
              </button>
            ))}
          </div>

          {(search || dateFilter !== '전체' || statusFilter !== '전체') && (
            <button onClick={() => { setSearch(''); setDateFilter('전체'); setStatusFilter('전체'); setPage(1); }}
              style={{ padding: '6px 12px', borderRadius: 20, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: 12, cursor: 'pointer' }}>
              필터 초기화
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <p style={{ margin: 0 }}>해당하는 리드가 없습니다.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {Object.entries(grouped).map(([unsoldId, { aptName, leads: aptLeads }]) => (
                <div key={unsoldId} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                  <div style={{ background: '#eff6ff', padding: '12px 20px', borderBottom: '1px solid #dbeafe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#1d4ed8' }}>{aptName}</span>
                      <span style={{ fontSize: 12, background: '#1d4ed8', color: '#fff', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>{aptLeads.length}건</span>
                    </div>
                    <Link href={`/unsold/${unsoldId}`} target="_blank" style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}>매물 보기 →</Link>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['상태', '이름', '전화번호', '메모', '등록일시', ''].map(h => (
                          <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {aptLeads.map((lead, i) => (
                        <tr key={lead.id} style={{ borderBottom: i < aptLeads.length - 1 ? '1px solid #f3f4f6' : 'none', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ padding: '8px 16px', whiteSpace: 'nowrap' }}>
                            <StatusBadge lead={lead} onChange={handleStatusChange} />
                          </td>
                          <td style={{ padding: '10px 16px', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>{lead.name}</td>
                          <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                            <a href={`tel:${lead.phone}`} style={{ color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}>{lead.phone}</a>
                          </td>
                          <td style={{ padding: '8px 16px', width: '100%' }}>
                            <MemoCell lead={lead} onSave={(id, memo) => setLeads(prev => prev.map(l => l.id === id ? { ...l, memo } : l))} />
                          </td>
                          <td style={{ padding: '10px 16px', color: '#9ca3af', whiteSpace: 'nowrap' }}>{fmtDate(lead.created_at)}</td>
                          <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                            <button onClick={() => setDeleteTarget(lead)}
                              style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#fef2f2', color: '#dc2626', fontSize: 12, cursor: 'pointer' }}>
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

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 28 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, cursor: page === 1 ? 'default' : 'pointer', color: page === 1 ? '#d1d5db' : '#374151' }}>‹ 이전</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => Math.abs(p - page) <= 2 || p === 1 || p === totalPages).map((p, i, arr) => (
                  <span key={p}>
                    {i > 0 && arr[i-1] !== p - 1 && <span style={{ color: '#9ca3af', padding: '0 4px' }}>…</span>}
                    <button onClick={() => setPage(p)}
                      style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: page === p ? '#1d4ed8' : '#fff', color: page === p ? '#fff' : '#374151', fontSize: 13, fontWeight: page === p ? 700 : 400, cursor: 'pointer' }}>
                      {p}
                    </button>
                  </span>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, cursor: page === totalPages ? 'default' : 'pointer', color: page === totalPages ? '#d1d5db' : '#374151' }}>다음 ›</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
