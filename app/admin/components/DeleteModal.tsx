'use client';

interface Props {
  title: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteModal({ title, description, onConfirm, onCancel }: Props) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, padding: '28px 28px 24px',
          width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>🗑️</div>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: '0 0 8px', textAlign: 'center' }}>
          {title}
        </h3>
        {description && (
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px', textAlign: 'center', lineHeight: 1.6 }}>
            {description}
          </p>
        )}
        {!description && <div style={{ marginBottom: 20 }} />}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '11px', borderRadius: 10, border: '1px solid #e5e7eb',
              background: '#fff', fontSize: 14, fontWeight: 700, color: '#374151', cursor: 'pointer',
            }}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '11px', borderRadius: 10, border: 'none',
              background: '#dc2626', fontSize: 14, fontWeight: 800, color: '#fff', cursor: 'pointer',
            }}
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
