import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  try {
    const env = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    for (const line of env.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const idx = t.indexOf('=');
      if (idx < 0) continue;
      const k = t.slice(0, idx).trim();
      const v = t.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  } catch { console.error('.env.local 로드 실패'); }
}
loadEnv();

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function main() {
  let total = 0;

  // unsold_listings
  const { data: unsold } = await db.from('unsold_listings').select('id, name, thumbnail_url, sections');
  for (const row of unsold ?? []) {
    const urls = [];
    if (row.thumbnail_url) urls.push(row.thumbnail_url);
    for (const sec of row.sections ?? []) for (const img of sec.images ?? []) urls.push(img);
    const sb = urls.filter(u => u?.includes('supabase.co'));
    if (sb.length) {
      console.log(`[unsold_listings] "${row.name}" (${row.id}) — ${sb.length}개`);
      sb.forEach(u => console.log(`  ${u}`));
      total += sb.length;
    }
  }

  // blog_posts
  const { data: blogs } = await db.from('blog_posts').select('id, title, thumbnail_url');
  for (const row of blogs ?? []) {
    const sb = [row.thumbnail_url].filter(u => u?.includes('supabase.co'));
    if (sb.length) {
      console.log(`[blog_posts] "${row.title}" (${row.id}) — ${sb.length}개`);
      sb.forEach(u => console.log(`  ${u}`));
      total += sb.length;
    }
  }

  // sale_content
  const { data: sc } = await db.from('sale_content').select('id, house_manage_no, thumbnail_url, image_urls');
  for (const row of sc ?? []) {
    const urls = [row.thumbnail_url, ...(row.image_urls ?? [])].filter(Boolean);
    const sb = urls.filter(u => u?.includes('supabase.co'));
    if (sb.length) {
      console.log(`[sale_content] house_manage_no=${row.house_manage_no} (${row.id}) — ${sb.length}개`);
      sb.forEach(u => console.log(`  ${u}`));
      total += sb.length;
    }
  }

  console.log(`\n총 남은 Supabase Storage URL: ${total}개`);
  if (total === 0) console.log('✅ 모든 URL이 R2로 교체 완료. unsold-images 버킷 삭제 가능합니다.');
  else console.log('⚠️  위 항목들의 URL을 먼저 R2로 교체해야 합니다.');
}

main().catch(e => { console.error('오류:', e); process.exit(1); });
