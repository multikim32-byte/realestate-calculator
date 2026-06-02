// isomorphic-dompurify → jsdom 네이티브 모듈 의존성으로 Turbopack 번들링 실패
// 순수 JS allowlist 방식으로 교체 (서버·클라이언트 모두 동작)

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'a', 'img',
  'blockquote', 'pre', 'code',
  'span', 'div', 'section',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'hr',
]);

const ALLOWED_ATTR = new Set([
  'href', 'src', 'alt', 'target', 'rel',
  'style', 'class', 'width', 'height', 'loading',
]);

// 위험한 프로토콜 차단
function isSafeUrl(url: string): boolean {
  const lower = url.trim().toLowerCase();
  return !lower.startsWith('javascript:') && !lower.startsWith('data:text') && !lower.startsWith('vbscript:');
}

// 속성 하나를 검사해 안전하면 그대로, 위험하면 제거
function sanitizeAttr(attrName: string, attrValue: string): string | null {
  if (!ALLOWED_ATTR.has(attrName)) return null;
  if ((attrName === 'href' || attrName === 'src') && !isSafeUrl(attrValue)) return null;
  // style에서 expression/url 제거
  if (attrName === 'style') {
    return attrValue.replace(/expression\s*\(|url\s*\(/gi, '');
  }
  return attrValue;
}

// 태그 문자열(<tag attr="val">) → 허용된 태그·속성만 남겨 반환
function sanitizeTag(match: string, tagName: string, attrStr: string, isClose: boolean): string {
  if (!ALLOWED_TAGS.has(tagName.toLowerCase())) return '';
  if (isClose) return `</${tagName}>`;

  // void elements
  const voidTags = new Set(['br', 'hr', 'img']);
  const attrs: string[] = [];
  const attrRe = /(\w[\w-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(attrStr)) !== null) {
    const name = m[1].toLowerCase();
    const value = m[2] ?? m[3] ?? m[4] ?? '';
    const safe = sanitizeAttr(name, value);
    if (safe !== null) attrs.push(`${name}="${safe.replace(/"/g, '&quot;')}"`);
  }

  const attrOut = attrs.length ? ' ' + attrs.join(' ') : '';
  if (voidTags.has(tagName.toLowerCase())) return `<${tagName}${attrOut}>`;
  return `<${tagName}${attrOut}>`;
}

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    // 스크립트·스타일·이벤트 핸들러 제거
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // 태그 처리
    .replace(/<(\/?)(\w[\w-]*)([^>]*)>/g, (match, slash, tag, attrs) =>
      sanitizeTag(match, tag, attrs, slash === '/')
    );
}
