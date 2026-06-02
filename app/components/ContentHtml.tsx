'use client';

import { sanitizeHtml } from '@/lib/sanitize';

export default function ContentHtml({ html, className, style }: { html: string; className?: string; style?: React.CSSProperties }) {
  return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}
