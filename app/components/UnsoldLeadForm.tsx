'use client';

import { useState } from 'react';

interface Props {
  unsoldId: string;
  aptName: string;
}

export default function UnsoldLeadForm({ unsoldId, aptName }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentThirdParty, setConsentThirdParty] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showThirdParty, setShowThirdParty] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setErrorMsg('이름과 전화번호를 모두 입력해주세요.');
      return;
    }
    if (!consentPrivacy || !consentThirdParty) {
      setErrorMsg('필수 동의 항목에 모두 동의해주세요.');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/unsold/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unsold_id: unsoldId, name, phone }),
      });
      if (res.ok) {
        setStatus('done');
      } else {
        throw new Error();
      }
    } catch {
      setStatus('error');
      setErrorMsg('오류가 발생했습니다. 다시 시도해주세요.');
    }
  }

  if (status === 'done') {
    return (
      <div style={{
        background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14,
        padding: '28px 24px', marginTop: 16, textAlign: 'center',
      }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
        <p style={{ fontSize: 16, fontWeight: 800, color: '#166534', margin: '0 0 6px' }}>관심 등록 완료!</p>
        <p style={{ fontSize: 14, color: '#4b7c5a', margin: 0 }}>담당자가 확인 후 연락드리겠습니다.</p>
      </div>
    );
  }

  return (
    <div style={{
      background: '#fff', border: '2px solid #1d4ed8', borderRadius: 14,
      padding: '24px 24px 20px', marginTop: 16,
    }}>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: '0 0 4px' }}>
          📞 관심 고객 등록
        </p>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
          이름과 연락처를 남겨주시면 담당자가 직접 연락드립니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="이름"
            maxLength={30}
            style={{
              flex: '1 1 120px', padding: '11px 14px', borderRadius: 8,
              border: '1px solid #d1d5db', fontSize: 14, outline: 'none',
            }}
          />
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="전화번호 (예: 010-1234-5678)"
            maxLength={20}
            style={{
              flex: '2 1 200px', padding: '11px 14px', borderRadius: 8,
              border: '1px solid #d1d5db', fontSize: 14, outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            style={{
              padding: '11px 24px', borderRadius: 8, border: 'none',
              background: status === 'loading' ? '#93c5fd' : '#1d4ed8',
              color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {status === 'loading' ? '등록 중...' : '관심 등록'}
          </button>
        </div>

        {/* 개인정보 동의 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={consentPrivacy} onChange={e => setConsentPrivacy(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
            <span>
              <strong style={{ color: '#dc2626' }}>[필수]</strong> 개인정보 수집·이용에 동의합니다.{' '}
              <button type="button" onClick={() => setShowPrivacy(v => !v)} style={{ fontSize: 11, color: '#1d4ed8', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                {showPrivacy ? '접기' : '상세보기'}
              </button>
            </span>
          </label>
          {showPrivacy && (
            <div style={{ fontSize: 11, color: '#6b7280', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '10px 12px', lineHeight: 1.8 }}>
              · 수집 항목: 성명, 전화번호<br />
              · 수집 목적: {aptName} 분양 상담 연락<br />
              · 보유 기간: 상담 완료 후 3개월<br />
              · 동의 거부 시 관심 고객 등록이 불가합니다.
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={consentThirdParty} onChange={e => setConsentThirdParty(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
            <span>
              <strong style={{ color: '#dc2626' }}>[필수]</strong> 개인정보 제3자 제공에 동의합니다.{' '}
              <button type="button" onClick={() => setShowThirdParty(v => !v)} style={{ fontSize: 11, color: '#1d4ed8', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                {showThirdParty ? '접기' : '상세보기'}
              </button>
            </span>
          </label>
          {showThirdParty && (
            <div style={{ fontSize: 11, color: '#6b7280', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '10px 12px', lineHeight: 1.8 }}>
              · 제공받는 자: {aptName} 시행사 및 분양대행사<br />
              · 제공 목적: 분양 상담 및 안내<br />
              · 제공 항목: 성명, 전화번호<br />
              · 보유 기간: 상담 완료 후 3개월<br />
              · 동의 거부 시 관심 고객 등록이 불가합니다.
            </div>
          )}
        </div>

        {errorMsg && (
          <p style={{ fontSize: 12, color: '#dc2626', margin: 0 }}>{errorMsg}</p>
        )}
      </form>
    </div>
  );
}
