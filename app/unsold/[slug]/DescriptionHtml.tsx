'use client';

import { sanitizeHtml } from '@/lib/sanitize';

function sanitizeHeadings(html: string) {
  return html.replace(/<h1(\s[^>]*)?>/gi, '<h2$1>').replace(/<\/h1>/gi, '</h2>');
}

export default function DescriptionHtml({ html }: { html: string }) {
  return (
    <div
      className="unsold-description"
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(sanitizeHeadings(html)) }}
    />
  );
}
