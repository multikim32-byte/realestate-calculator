/**
 * R2 고아(orphaned) 이미지 정리 스크립트
 * - DB(Supabase)에서 참조되지 않는 R2 파일을 찾아 삭제합니다.
 * - 실행: node scripts/cleanup-r2.mjs
 * - dry-run 확인 후 삭제하려면: node scripts/cleanup-r2.mjs --delete
 */

import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── 환경변수 로드 ──────────────────────────────────────
function loadEnv() {
  try {
    const env = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    for (const line of env.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx < 0) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    console.error('⚠️  .env.local을 찾을 수 없습니다.');
  }
}
loadEnv();

const DELETE_MODE = process.argv.includes('--delete');
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // https://pub-xxx.r2.dev

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ── R2 URL → key 변환 ──────────────────────────────────
function urlToKey(url) {
  if (!url || !url.startsWith(R2_PUBLIC_URL)) return null;
  return url.slice(R2_PUBLIC_URL.length + 1); // strip trailing slash
}

// ── R2 전체 파일 목록 조회 ─────────────────────────────
async function listAllR2Keys() {
  const keys = [];
  let token;
  do {
    const res = await r2.send(new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      ContinuationToken: token,
    }));
    for (const obj of res.Contents ?? []) keys.push(obj.Key);
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

// ── Supabase에서 참조 중인 모든 R2 URL 수집 ───────────
async function collectReferencedUrls() {
  const urls = new Set();

  // 1. unsold_listings: thumbnail_url + sections[].images[]
  const { data: unsold } = await db
    .from('unsold_listings')
    .select('thumbnail_url, sections');
  for (const row of unsold ?? []) {
    if (row.thumbnail_url) urls.add(row.thumbnail_url);
    for (const sec of row.sections ?? []) {
      for (const img of sec.images ?? []) urls.add(img);
    }
  }

  // 2. blog_posts: thumbnail_url
  const { data: blogs } = await db
    .from('blog_posts')
    .select('thumbnail_url');
  for (const row of blogs ?? []) {
    if (row.thumbnail_url) urls.add(row.thumbnail_url);
  }

  // 3. sale_content: thumbnail_url + image_urls[]
  const { data: saleContent } = await db
    .from('sale_content')
    .select('thumbnail_url, image_urls');
  for (const row of saleContent ?? []) {
    if (row.thumbnail_url) urls.add(row.thumbnail_url);
    for (const img of row.image_urls ?? []) urls.add(img);
  }

  return urls;
}

// ── 메인 ──────────────────────────────────────────────
async function main() {
  console.log('🔍 R2 파일 목록 조회 중...');
  const r2Keys = await listAllR2Keys();
  console.log(`  R2 총 파일 수: ${r2Keys.length}개`);

  console.log('📋 DB 참조 URL 수집 중...');
  const refUrls = await collectReferencedUrls();
  const refKeys = new Set([...refUrls].map(urlToKey).filter(Boolean));
  console.log(`  DB 참조 파일 수: ${refKeys.size}개`);

  const orphans = r2Keys.filter(k => !refKeys.has(k));
  console.log(`\n🗑️  고아 파일 수: ${orphans.length}개`);

  if (orphans.length === 0) {
    console.log('✅ 정리할 파일이 없습니다.');
    return;
  }

  orphans.forEach(k => console.log(`  - ${k}`));

  if (!DELETE_MODE) {
    console.log('\n⚠️  dry-run 모드입니다. 실제 삭제하려면 --delete 옵션을 추가하세요:');
    console.log('   node scripts/cleanup-r2.mjs --delete');
    return;
  }

  // 1000개씩 배치 삭제 (S3 API 제한)
  console.log('\n🗑️  삭제 시작...');
  const BATCH = 1000;
  for (let i = 0; i < orphans.length; i += BATCH) {
    const batch = orphans.slice(i, i + BATCH);
    await r2.send(new DeleteObjectsCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Delete: { Objects: batch.map(Key => ({ Key })) },
    }));
    console.log(`  ${Math.min(i + BATCH, orphans.length)}/${orphans.length} 삭제 완료`);
  }
  console.log('✅ 정리 완료!');
}

main().catch(e => { console.error('❌ 오류:', e); process.exit(1); });
