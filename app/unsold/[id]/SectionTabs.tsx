import type { UnsoldSection } from '@/lib/supabase';

export default function SectionTabs({ sections }: { sections: UnsoldSection[] }) {
  const activeSections = sections.filter(s => s.images.length > 0);
  if (activeSections.length === 0) return null;

  return (
    <div style={{ marginTop: 32 }}>
      {activeSections.map(section => (
        <div key={section.name} style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #e5e7eb' }}>
            {section.name}
          </h3>
          {section.images.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`${section.name} ${i + 1}`}
              loading="lazy"
              decoding="async"
              style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 8, marginBottom: 8 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
