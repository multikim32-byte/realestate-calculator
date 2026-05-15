'use client';

import { useState, useMemo } from 'react';
import type { PublicSaleItem } from '@/lib/publicDataApi';
import type { ScheduleNote } from './page';

interface Props {
  items: PublicSaleItem[];
  notes: ScheduleNote[];
}

type Row = {
  key: string;
  isCustom: boolean;
  noteId?: string;
  houseManageNo?: string;
  name: string;
  location: string;
  receiptStart: string;
  receiptEnd: string;
  winnerDate: string;
  contact: string;
  hmpgUrl: string;   // 건설사/분양사 홈페이지
  pblancUrl: string; // 청약홈 공고
  status?: string;
  buildingType?: string;
  memo: string;
  isHidden: boolean;
};

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  '청약예정': { bg: '#e8f0fe', color: '#1a56db' },
  '청약중':   { bg: '#d1fae5', color: '#065f46' },
  '당첨발표': { bg: '#fef3c7', color: '#92400e' },
  '청약마감': { bg: '#f3f4f6', color: '#6b7280' },
};

const EMPTY_FORM = {
  custom_name: '', custom_location: '',
  custom_receipt_start: '', custom_receipt_end: '',
  custom_winner_date: '', custom_contact: '', custom_url: '', memo: '',
};

function downloadCSV(rows: Row[]) {
  const headers = ['단지명', '위치', '청약접수 시작', '청약접수 종료', '당첨발표일', '전화번호', '홈페이지', '청약공고', '상태', '메모'];
  const lines = [
    headers,
    ...rows.map(r => [
      r.name, r.location, r.receiptStart, r.receiptEnd,
      r.winnerDate, r.contact, r.hmpgUrl, r.pblancUrl, r.status ?? '', r.memo,
    ]),
  ].map(cells => cells.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','));
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `청약일정_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function SaleScheduleClient({ items, notes }: Props) {
  const [notesMap, setNotesMap] = useState<Record<string, ScheduleNote>>(() => {
    const map: Record<string, ScheduleNote> = {};
    for (const n of notes) {
      if (n.house_manage_no) map[n.house_manage_no] = n;
    }
    return map;
  });
  const [customNotes, setCustomNotes] = useState<ScheduleNote[]>(notes.filter(n => n.is_custom));
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [memoText, setMemoText] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addSaving, setAddSaving] = useState(false);
  const [search, setSearch] = useState('');

  // API 항목 → Row 변환
  const apiRows: Row[] = items.map(item => {
    const note = notesMap[item.houseManageNo];
    return {
      key: item.houseManageNo,
      isCustom: false,
      noteId: note?.id,
      houseManageNo: item.houseManageNo,
      name: item.name,
      location: item.location,
      receiptStart: item.receiptStart,
      receiptEnd: item.receiptEnd,
      winnerDate: item.winnerDate,
      contact: item.contact,
      hmpgUrl: item.hmpgUrl || '',
      pblancUrl: item.pblancUrl || '',
      status: item.status,
      buildingType: item.buildingType,
      memo: note?.memo ?? '',
      isHidden: note?.is_hidden ?? false,
    };
  });

  // 커스텀 항목 → Row 변환
  const customRows: Row[] = customNotes.map(n => ({
    key: n.id,
    isCustom: true,
    noteId: n.id,
    name: n.custom_name ?? '',
    location: n.custom_location ?? '',
    receiptStart: n.custom_receipt_start ?? '',
    receiptEnd: n.custom_receipt_end ?? '',
    winnerDate: n.custom_winner_date ?? '',
    contact: n.custom_contact ?? '',
    hmpgUrl: n.custom_url ?? '',
    pblancUrl: '',
    memo: n.memo,
    isHidden: n.is_hidden,
  }));

  // 당첨발표일 오름차순 정렬 (날짜 없는 항목은 뒤로)
  function sortByWinnerDate(rows: Row[]) {
    return [...rows].sort((a, b) => {
      if (!a.winnerDate && !b.winnerDate) return 0;
      if (!a.winnerDate) return 1;
      if (!b.winnerDate) return -1;
      return a.winnerDate.localeCompare(b.winnerDate);
    });
  }

  // 동일 단지명 중복 제거 — receiptStart 기준 최신 1건만 유지
  const deduplicatedApiRows = (() => {
    const map = new Map<string, Row>();
    for (const row of apiRows) {
      const existing = map.get(row.name);
      const rowDate = row.receiptStart || row.winnerDate || '';
      const existingDate = existing ? (existing.receiptStart || existing.winnerDate || '') : '';
      if (!existing || rowDate > existingDate) {
        map.set(row.name, row);
      }
    }
    return Array.from(map.values());
  })();

  const allRows = sortByWinnerDate([...customRows, ...deduplicatedApiRows]);

  const filteredRows = useMemo(() => {
    let rows = allRows;
    if (!showHidden) rows = rows.filter(r => !r.isHidden);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.memo.toLowerCase().includes(q)
      );
    }
    // 필터 후에도 당첨발표일 오름차순 유지
    return sortByWinnerDate(rows);
  }, [allRows, showHidden, search]);

  const hiddenCount = allRows.filter(r => r.isHidden).length;

  async function saveMemo(row: Row) {
    setSaving(row.key);
    try {
      const res = await fetch('/api/admin/sale-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ house_manage_no: row.houseManageNo, memo: memoText }),
      });
      const saved = await res.json();
      if (row.houseManageNo) {
        setNotesMap(prev => ({ ...prev, [row.houseManageNo!]: saved }));
      }
    } finally {
      setSaving(null);
      setEditingKey(null);
      setMemoText('');
    }
  }

  async function hideRow(row: Row) {
    if (!confirm(`"${row.name}" 을(를) 숨기시겠습니까?`)) return;
    setSaving(row.key);
    try {
      await fetch('/api/admin/sale-schedule', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row.isCustom ? { id: row.noteId } : { house_manage_no: row.houseManageNo }),
      });
      if (row.isCustom) {
        setCustomNotes(prev => prev.filter(n => n.id !== row.noteId));
      } else {
        setNotesMap(prev => ({
          ...prev,
          [row.houseManageNo!]: { ...(prev[row.houseManageNo!] ?? {} as any), is_hidden: true },
        }));
      }
    } finally {
      setSaving(null);
    }
  }

  async function restoreRow(row: Row) {
    if (!row.noteId) return;
    setSaving(row.key);
    try {
      const res = await fetch('/api/admin/sale-schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.noteId }),
      });
      const saved = await res.json();
      if (row.houseManageNo) {
        setNotesMap(prev => ({ ...prev, [row.houseManageNo!]: saved }));
      } else {
        setCustomNotes(prev => prev.map(n => n.id === row.noteId ? saved : n));
      }
    } finally {
      setSaving(null);
    }
  }

  async function addCustom() {
    if (!addForm.custom_name.trim()) { alert('단지명을 입력하세요.'); return; }
    setAddSaving(true);
    try {
      const res = await fetch('/api/admin/sale-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_custom: true, ...addForm }),
      });
      const saved = await res.json();
      setCustomNotes(prev => [saved, ...prev]);
      setAddForm(EMPTY_FORM);
      setShowAddForm(false);
    } finally {
      setAddSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', borderRadius: 6,
    border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box',
  };

  return (
    <div>
      {/* 툴바 */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <input
          placeholder="단지명·위치·메모 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, width: 240, flex: 'none' }}
        />
        <span style={{ fontSize: 13, color: '#6b7280' }}>
          {filteredRows.length}건 표시
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {hiddenCount > 0 && (
            <button
              onClick={() => setShowHidden(p => !p)}
              style={{
                padding: '7px 14px', borderRadius: 7, border: '1px solid #d1d5db',
                background: showHidden ? '#fef3c7' : '#fff',
                fontSize: 13, cursor: 'pointer', fontWeight: 600,
              }}
            >
              {showHidden ? '숨김 항목 숨기기' : `숨긴 항목 보기 (${hiddenCount})`}
            </button>
          )}
          <button
            onClick={() => { setShowAddForm(p => !p); setAddForm(EMPTY_FORM); }}
            style={{
              padding: '7px 14px', borderRadius: 7, border: 'none',
              background: '#1d4ed8', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 700,
            }}
          >
            + 항목 추가
          </button>
          <button
            onClick={() => downloadCSV(filteredRows)}
            style={{
              padding: '7px 14px', borderRadius: 7, border: '1px solid #d1d5db',
              background: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 700, color: '#059669',
            }}
          >
            ⬇ 엑셀 다운로드
          </button>
        </div>
      </div>

      {/* 항목 추가 폼 */}
      {showAddForm && (
        <div style={{
          background: '#eff6ff', borderRadius: 10, padding: 20,
          border: '1px solid #bfdbfe', marginBottom: 16,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1d4ed8', margin: '0 0 14px' }}>직접 항목 추가</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 10 }}>
            {[
              { key: 'custom_name', label: '단지명 *' },
              { key: 'custom_location', label: '위치' },
              { key: 'custom_receipt_start', label: '청약접수 시작 (YYYY-MM-DD)' },
              { key: 'custom_receipt_end', label: '청약접수 종료 (YYYY-MM-DD)' },
              { key: 'custom_winner_date', label: '당첨발표일 (YYYY-MM-DD)' },
              { key: 'custom_contact', label: '전화번호' },
              { key: 'custom_url', label: '공식 홈페이지 URL' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: 4 }}>{label}</label>
                <input
                  value={(addForm as any)[key]}
                  onChange={e => setAddForm(prev => ({ ...prev, [key]: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: 4 }}>메모</label>
            <textarea
              value={addForm.memo}
              onChange={e => setAddForm(prev => ({ ...prev, memo: e.target.value }))}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="메모 (선택)"
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={addCustom}
              disabled={addSaving}
              style={{
                padding: '7px 18px', borderRadius: 7, border: 'none',
                background: '#1d4ed8', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 700,
              }}
            >
              {addSaving ? '저장 중…' : '저장'}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              style={{
                padding: '7px 14px', borderRadius: 7, border: '1px solid #d1d5db',
                background: '#fff', fontSize: 13, cursor: 'pointer',
              }}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 테이블 */}
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
              {['구분', '단지명', '위치', '청약접수일', '당첨발표일', '전화번호', '공식링크', '메모', '액션'].map(h => (
                <th key={h} style={{
                  padding: '10px 12px', textAlign: 'left', fontWeight: 700,
                  color: '#374151', fontSize: 12, whiteSpace: 'nowrap',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                  항목이 없습니다.
                </td>
              </tr>
            )}
            {filteredRows.map((row, idx) => {
              const isEditing = editingKey === row.key;
              const isSaving = saving === row.key;
              const sc = row.status ? STATUS_COLOR[row.status] ?? { bg: '#f3f4f6', color: '#374151' } : null;

              return (
                <>
                  <tr
                    key={row.key}
                    style={{
                      borderBottom: isEditing ? 'none' : '1px solid #f3f4f6',
                      background: row.isHidden ? '#fafafa' : idx % 2 === 0 ? '#fff' : '#fafeff',
                      opacity: row.isHidden ? 0.5 : 1,
                    }}
                  >
                    {/* 구분 */}
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {row.isCustom && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', padding: '1px 6px', borderRadius: 4 }}>
                            직접추가
                          </span>
                        )}
                        {sc && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: sc.color, background: sc.bg, padding: '1px 6px', borderRadius: 4 }}>
                            {row.status}
                          </span>
                        )}
                        {row.buildingType && (
                          <span style={{ fontSize: 10, color: '#9ca3af' }}>{row.buildingType}</span>
                        )}
                      </div>
                    </td>

                    {/* 단지명 */}
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1e293b', minWidth: 140 }}>
                      {row.name}
                    </td>

                    {/* 위치 */}
                    <td style={{ padding: '10px 12px', color: '#374151', minWidth: 120 }}>
                      {row.location}
                    </td>

                    {/* 청약접수일 */}
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: '#374151' }}>
                      {row.receiptStart && row.receiptEnd
                        ? <>{row.receiptStart}<br /><span style={{ color: '#9ca3af' }}>~ {row.receiptEnd}</span></>
                        : row.receiptStart || '-'}
                    </td>

                    {/* 당첨발표일 */}
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: '#374151' }}>
                      {row.winnerDate || '-'}
                    </td>

                    {/* 전화번호 */}
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      {row.contact
                        ? <a href={`tel:${row.contact}`} style={{ color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}>{row.contact}</a>
                        : <span style={{ color: '#d1d5db' }}>-</span>}
                    </td>

                    {/* 공식링크 */}
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {row.hmpgUrl
                          ? <a href={row.hmpgUrl} target="_blank" rel="noopener noreferrer"
                              style={{ color: '#059669', textDecoration: 'none', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>
                              🏠 홈페이지
                            </a>
                          : null}
                        {row.pblancUrl
                          ? <a href={row.pblancUrl} target="_blank" rel="noopener noreferrer"
                              style={{ color: '#1d4ed8', textDecoration: 'none', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>
                              📋 청약공고
                            </a>
                          : null}
                        {!row.hmpgUrl && !row.pblancUrl && <span style={{ color: '#d1d5db' }}>-</span>}
                      </div>
                    </td>

                    {/* 메모 미리보기 */}
                    <td style={{ padding: '10px 12px', maxWidth: 200 }}>
                      {row.memo
                        ? <span style={{ fontSize: 12, color: '#374151', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {row.memo}
                          </span>
                        : <span style={{ fontSize: 12, color: '#d1d5db' }}>메모 없음</span>}
                    </td>

                    {/* 액션 */}
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {row.isHidden ? (
                          <button
                            onClick={() => restoreRow(row)}
                            disabled={isSaving}
                            style={{
                              padding: '4px 10px', borderRadius: 5, border: '1px solid #d1d5db',
                              background: '#fff', fontSize: 12, cursor: 'pointer', color: '#059669', fontWeight: 600,
                            }}
                          >
                            복원
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingKey(isEditing ? null : row.key);
                                setMemoText(row.memo);
                              }}
                              style={{
                                padding: '4px 10px', borderRadius: 5, border: '1px solid #d1d5db',
                                background: isEditing ? '#eff6ff' : '#fff',
                                fontSize: 12, cursor: 'pointer', color: '#1d4ed8', fontWeight: 600,
                              }}
                            >
                              메모
                            </button>
                            <button
                              onClick={() => hideRow(row)}
                              disabled={isSaving}
                              style={{
                                padding: '4px 10px', borderRadius: 5, border: '1px solid #fecaca',
                                background: '#fff', fontSize: 12, cursor: 'pointer', color: '#dc2626', fontWeight: 600,
                              }}
                            >
                              {isSaving ? '…' : '삭제'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* 메모 편집 행 */}
                  {isEditing && (
                    <tr key={`${row.key}-memo`} style={{ borderBottom: '1px solid #f3f4f6', background: '#f0f9ff' }}>
                      <td colSpan={9} style={{ padding: '12px 16px' }}>
                        <div style={{ maxWidth: 800 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', marginBottom: 6 }}>
                            메모 편집 — {row.name}
                          </div>
                          <textarea
                            value={memoText}
                            onChange={e => setMemoText(e.target.value)}
                            rows={5}
                            maxLength={2000}
                            style={{
                              width: '100%', padding: '10px 12px', borderRadius: 7,
                              border: '1px solid #93c5fd', fontSize: 13, resize: 'vertical',
                              fontFamily: 'inherit', boxSizing: 'border-box',
                            }}
                            placeholder="메모를 입력하세요 (최대 2,000자)"
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>{memoText.length} / 2,000자</span>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                onClick={() => { setEditingKey(null); setMemoText(''); }}
                                style={{
                                  padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db',
                                  background: '#fff', fontSize: 13, cursor: 'pointer',
                                }}
                              >
                                취소
                              </button>
                              <button
                                onClick={() => saveMemo(row)}
                                disabled={saving === row.key}
                                style={{
                                  padding: '6px 18px', borderRadius: 6, border: 'none',
                                  background: '#1d4ed8', color: '#fff', fontSize: 13,
                                  cursor: 'pointer', fontWeight: 700,
                                }}
                              >
                                {saving === row.key ? '저장 중…' : '저장'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: '#9ca3af' }}>
        * 청약홈 API 기준 데이터 · 삭제는 이 화면에서만 숨김 처리됩니다 · 엑셀 다운로드는 현재 표시된 목록 기준
      </div>
    </div>
  );
}
