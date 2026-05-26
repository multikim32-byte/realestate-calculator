'use client';

import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = ['p','br','strong','em','b','i','u','s','h1','h2','h3','h4','h5','h6','ul','ol','li','a','img','blockquote','pre','code','span','div','section','table','thead','tbody','tr','th','td','hr'];
const ALLOWED_ATTR = ['href','src','alt','target','rel','style','class','width','height','loading'];

export default function ContentHtml({ html, className, style }: { html: string; className?: string; style?: React.CSSProperties }) {
  const clean = DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR, ALLOW_DATA_ATTR: false });
  return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: clean }} />;
}
