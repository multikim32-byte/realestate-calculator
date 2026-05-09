'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type PushLog = {
  id: string;
  title: string;
  body: string;
  url: string;
  sent_count: number;
  total_count: number;
  created_at: string;
};

export default function AdminPushPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; total: number } | null>(null);
  const [error, setError] = useState('');
  const [subCount, setSubCount] = useState<number | null>(null);
  const [logs, setLogs] = useState<PushLog[]>([]);
  const router = useRouter();

  const fetchLogs = useCallback(() => {
    fetch('/api/push/logs')
      .then(r => r.ok ? r.json() : [])
      .then(data => setLogs(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/admin/unsold')
      .then(r => { if (r.status === 401) router.push('/admin'); })
      .catch(() => {});
    fetch('/api/push/subscribe')
      .then(r => r.json())
      .then(d => setSubCount(d.count ?? null))
      .catch(() => {});
    fetchLogs();
  }, [router, fetchLogs]);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) { setError('제목과 내용을 입력하세요.'); return; }
    setSending(true);
    setError('');
    setResult(null);
    const res = await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), body: body.trim(), url: url.trim() || '/' }),
    });
    setSending(false);
    if (res.ok) {
      const data = await res.json();
      setResult(data);
      setTitle('');
      setBody('');
      setUrl('/');
      fetchLogs();
    } else {
      setError('발송 실패. 다시 시도해주세요.');
    }
  };

  const PRESETS = [
    { label: '청약 시작', title: '🔔 새 청약이 시작됐어요!', body: '오늘부터 청약 접수를 시작합니다. 지금 확인해보세요.', url: '/' },
    { label: '미분양 업데이트', title: '🏠 미분양 정보 업데이트', body: '새로운 미분양 매물이 등록됐습니다. 확인해보세요.', url: '/unsold' },
    { label: '금리 소식', title: '📊 금리 변동 안내', body: '주택담보대출 금리 정보를 업데이트했습니다.', url: '/calculator' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ background: '#1e293b', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/admin" style={{ color: '#fff', fontWeight: 800, fontSize: 16, textDecoration: 'none' }}>🏠 관리자</Link>
          <span style={{ color: '#a78bfa', fontSize: 14, fontWeight: 700 }}>푸시 알림 발송</span>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0 }}>푸시 알림 발송</h1>
          {subCount !== null && (
            <span style={{ fontSize: 13, background: '#ede9fe', color: '#7c3aed', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
              구독자 {subCount}명
            </span>
          )}
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 28px' }}>앱을 설치한 모든 구독자에게 푸시 알림을 발송합니다.</p>

        {/* 빠른 템플릿 */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: '0 0 10px' }}>빠른 템플릿</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => { setTitle(p.title); setBody(p.body); setUrl(p.url); setResult(null); setError(''); }}
                style={{
                  padding: '7px 14px', borderRadius: 20, border: '1px solid #e5e7eb',
                  background: '#fff', fontSize: 13, cursor: 'pointer', color: '#374151',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 입력 폼 */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '24px' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>제목</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={60}
              placeholder="알림 제목"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>내용</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              maxLength={120}
              rows={3}
              placeholder="알림 내용"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>링크 URL</label>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="/unsold"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>

          {error && <p style={{ fontSize: 13, color: '#dc2626', margin: '0 0 12px' }}>{error}</p>}

          {result && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#166534' }}>
                발송 완료 — {result.total}명 중 {result.sent}명에게 전달됐습니다.
              </p>
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={sending}
            style={{
              width: '100%', padding: '12px', borderRadius: 10, border: 'none',
              background: sending ? '#c4b5fd' : '#7c3aed', color: '#fff',
              fontSize: 15, fontWeight: 800, cursor: sending ? 'not-allowed' : 'pointer',
            }}
          >
            {sending ? '발송 중...' : '전체 발송'}
          </button>
        </div>

        {/* 발송 기록 */}
        <div style={{ marginTop: 36 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: '0 0 14px' }}>
            발송 기록 {logs.length > 0 ? `(최근 ${logs.length}건)` : ''}
          </p>
          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 20px', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', color: '#9ca3af', fontSize: 13 }}>
              발송 기록이 없습니다.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {logs.map(log => (
                <div key={log.id} style={{
                  background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
                  padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 3 }}>{log.title}</div>
                    <div style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>{log.body}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                      {log.url !== '/' && <span style={{ marginRight: 8 }}>→ {log.url}</span>}
                      {new Date(log.created_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#7c3aed' }}>{log.sent_count}명</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>/{log.total_count}명</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
