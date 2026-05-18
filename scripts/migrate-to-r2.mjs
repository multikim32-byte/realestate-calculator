/**
 * Supabase Storage → Cloudflare R2 이전 스크립트
 *
 * 실행 전 .env.local에 R2 환경변수가 설정되어 있어야 합니다.
 * 실행: node scripts/migrate-to-r2.mjs
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// .env.local 수동 로드 (dotenv 없이)
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
    console.error('⚠️  .env.local 파일을 찾을 수 없습니다. 환경변수가 이미 설정되어 있어야 합니다.');
  }
}

loadEnv();

const {
  NEXT_PUBLIC_SUPABASE_URL: SB_URL,
  SUPABASE_SERVICE_ROLE_KEY: SB_KEY,
  R2_ENDPOINT,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
  R2_PUBLIC_URL,
} = process.env;

if (!SB_URL || !SB_KEY || !R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
  console.error('❌ 필수 환경변수 누락. .env.local 확인 필요');
  process.exit(1);
}

const supabase = createClient(SB_URL, SB_KEY);
const r2 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

// unsold-images 버킷의 모든 파일 목록 조회
async function listAllFiles() {
  const all = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage
      .from('unsold-images')
      .list('', { limit: 100, offset });
    if (error) { console.error('목록 조회 실패:', error.message); break; }
    if (!data?.length) break;
    all.push(...data.filter(f => f.name !== '.emptyFolderPlaceholder'));
    if (data.length < 100) break;
    offset += 100;
  }
  return all;
}

function supabaseToR2Url(supabaseUrl) {
  return supabaseUrl.replace(
    /https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\/unsold-images\//,
    `${R2_PUBLIC_URL}/unsold/`
  );
}

async function main() {
  console.log('🚀 Supabase → Cloudflare R2 이전 시작\n');

  // ── 1. 파일 목록 ────────────────────────────────────────────────────────────
  process.stdout.write('📋 파일 목록 조회 중...');
  const files = await listAllFiles();
  console.log(` ${files.length}개 발견\n`);

  // ── 2. 파일 이전 ────────────────────────────────────────────────────────────
  let success = 0, skipped = 0, failed = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const srcUrl = `${SB_URL}/storage/v1/object/public/unsold-images/${file.name}`;
    const r2Key = `unsold/${file.name}`;

    process.stdout.write(`\r[${i + 1}/${files.length}] ${file.name.slice(0, 40).padEnd(40)}`);

    try {
      const res = await fetch(srcUrl, { signal: AbortSignal.timeout(15000) });
      if (res.status === 404) { skipped++; continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const buffer = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get('content-type') || 'image/webp';

      await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: r2Key,
        Body: buffer,
        ContentType: contentType,
      }));
      success++;
    } catch (e) {
      console.error(`\n  ❌ 실패: ${file.name} — ${e.message}`);
      failed++;
    }
  }

  console.log(`\n\n📊 파일 이전: 성공 ${success} / 실패 ${failed} / 스킵 ${skipped}\n`);
  if (failed > 0) {
    console.log('⚠️  실패한 파일이 있습니다. 다시 실행하면 재시도합니다.\n');
  }

  // ── 3. DB URL 교체 ───────────────────────────────────────────────────────────
  console.log('🔄 DB URL 교체 시작...');

  const { data: listings, error: fetchErr } = await supabase
    .from('unsold_listings')
    .select('id, thumbnail_url, sections');

  if (fetchErr) { console.error('❌ DB 조회 실패:', fetchErr.message); process.exit(1); }

  let dbUpdated = 0;
  for (const listing of listings) {
    const updates = {};

    // thumbnail_url
    if (listing.thumbnail_url?.includes('supabase.co')) {
      updates.thumbnail_url = supabaseToR2Url(listing.thumbnail_url);
    }

    // sections JSONB 내 images 배열
    if (Array.isArray(listing.sections)) {
      const newSections = listing.sections.map(sec => ({
        ...sec,
        images: (sec.images ?? []).map(url =>
          url?.includes('supabase.co') ? supabaseToR2Url(url) : url
        ),
      }));
      if (JSON.stringify(newSections) !== JSON.stringify(listing.sections)) {
        updates.sections = newSections;
      }
    }

    if (Object.keys(updates).length === 0) continue;

    const { error: updateErr } = await supabase
      .from('unsold_listings')
      .update(updates)
      .eq('id', listing.id);

    if (updateErr) {
      console.error(`  ❌ DB 업데이트 실패 (id=${listing.id}):`, updateErr.message);
    } else {
      dbUpdated++;
    }
  }

  console.log(`✅ DB 업데이트 완료: ${dbUpdated}개 레코드`);
  console.log('\n🎉 마이그레이션 완료!');
  console.log('   ➜ 미분양 페이지에서 이미지가 정상 표시되는지 확인하세요.');
}

main().catch(e => {
  console.error('\n❌ 스크립트 오류:', e);
  process.exit(1);
});
