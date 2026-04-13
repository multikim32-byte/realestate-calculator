import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseAdmin';
import Anthropic from '@anthropic-ai/sdk';
import https from 'node:https';
import http from 'node:http';

// SSL 검증 무시 + 리다이렉트 최대 5회 따라가는 HTML fetcher
function fetchHtml(targetUrl: string, maxRedirects = 5): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const client = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'GET',
      rejectUnauthorized: false, // 자체 서명 인증서 허용
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Accept-Encoding': 'identity',
        'Connection': 'close',
      },
      timeout: 15000,
    };

    const req = client.request(options, (res) => {
      // 리다이렉트 처리
      if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308)
          && res.headers.location && maxRedirects > 0) {
        const redirectUrl = new URL(res.headers.location, targetUrl).href;
        res.resume();
        fetchHtml(redirectUrl, maxRedirects - 1).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      res.on('error', reject);
    });

    req.on('timeout', () => { req.destroy(); reject(new Error('요청 시간 초과')); });
    req.on('error', reject);
    req.end();
  });
}

// 이미지 buffer 다운로드 (SSL 무시)
function fetchImageBuffer(imgUrl: string): Promise<{ buf: Buffer; ct: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(imgUrl);
    const client = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'GET',
      rejectUnauthorized: false,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'image/*',
      },
      timeout: 10000,
    };

    const req = client.request(options, (res) => {
      if (res.statusCode && res.statusCode >= 400) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      // 리다이렉트
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        res.resume();
        fetchImageBuffer(new URL(res.headers.location, imgUrl).href).then(resolve).catch(reject);
        return;
      }
      const ct = res.headers['content-type'] ?? '';
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => resolve({ buf: Buffer.concat(chunks), ct }));
      res.on('error', reject);
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    req.end();
  });
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL이 필요합니다.' }, { status: 400 });

    // 1. HTML 가져오기
    let html = '';
    try {
      html = await fetchHtml(url);
    } catch (e) {
      return NextResponse.json({ error: `사이트 접속 실패: ${String(e)}` }, { status: 400 });
    }

    // 2. 메타 태그 추출
    const getMeta = (prop: string) => {
      const r1 = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']{1,500})["']`, 'i'));
      const r2 = html.match(new RegExp(`<meta[^>]+content=["']([^"']{1,500})["'][^>]+(?:property|name)=["']${prop}["']`, 'i'));
      return (r1 || r2)?.[1]?.trim() ?? '';
    };

    const ogTitle = getMeta('og:title') || html.match(/<title[^>]*>([^<]{1,200})<\/title>/i)?.[1]?.trim() || '';
    const ogDesc  = getMeta('og:description') || getMeta('description');
    const ogImage = getMeta('og:image');

    // 3. 이미지 URL 수집
    const imgMatches = [
      ...html.matchAll(/(?:src|data-src|data-original|data-lazy-src)=["']([^"']+\.(?:jpe?g|png|webp|gif)(?:\?[^"']*)?)["']/gi),
    ];
    const rawImgUrls = imgMatches.map(m => {
      try { return new URL(m[1], url).href; } catch { return null; }
    }).filter(Boolean) as string[];

    const imageUrls = [...new Set([
      ...(ogImage ? [(() => { try { return new URL(ogImage, url).href; } catch { return null; } })()] : []),
      ...rawImgUrls.filter(u =>
        !u.match(/icon|logo|btn|button|arrow|close|kakao|naver|facebook|sns|share|blank|1x1|pixel|spinner|loading/i)
      ),
    ])].filter(Boolean).slice(0, 40) as string[];

    // 4. 본문 텍스트 추출
    const bodyText = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000);

    // 5. Claude AI 로 정보 추출
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    let extracted: Record<string, unknown> = {};
    try {
      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `아래는 한국 부동산 분양 사이트의 내용입니다. JSON으로만 답하세요. 다른 설명 없이 JSON만 출력하세요.

URL: ${url}
페이지 제목: ${ogTitle}
메타 설명: ${ogDesc}
본문: ${bodyText}

추출 형식:
{
  "name": "단지명 (브랜드명+단지명, 예: 더트리 오종합)",
  "location": "시도 시군구 형식 (예: 경기 하남시)",
  "category": "아파트 또는 오피스텔 또는 상가",
  "min_price": 최저분양가를 만원 단위 숫자로 또는 null,
  "benefit": "계약금·중도금·혜택 핵심 문구 또는 null",
  "description": "단지 소개 2~3문장 요약"
}`,
        }],
      });
      const text = message.content[0].type === 'text' ? message.content[0].text : '';
      const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] ?? '{}';
      extracted = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Claude 추출 실패:', e);
    }

    // 6. 이미지 Supabase Storage 업로드
    const supabase = createAdminClient();
    const uploadedImages: string[] = [];

    await Promise.allSettled(
      imageUrls.map(async (imgUrl) => {
        try {
          const { buf, ct } = await fetchImageBuffer(imgUrl);
          if (!ct.startsWith('image/')) return;
          if (buf.length < 5000) return; // 5KB 미만 스킵

          const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
          const path = `scraped/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error } = await supabase.storage
            .from('unsold-images')
            .upload(path, buf, { contentType: ct });
          if (!error) {
            const { data: { publicUrl } } = supabase.storage
              .from('unsold-images')
              .getPublicUrl(path);
            uploadedImages.push(publicUrl);
          }
        } catch {}
      })
    );

    return NextResponse.json({
      name:        (extracted.name       as string)  || ogTitle || '',
      location:    (extracted.location   as string)  || '',
      category:    (extracted.category   as string)  || '아파트',
      min_price:   (extracted.min_price  as number)  || null,
      benefit:     (extracted.benefit    as string)  || null,
      description: extracted.description
        ? `<p>${(extracted.description as string).replace(/\n/g, '</p><p>')}</p>`
        : null,
      thumbnail_url:    uploadedImages[0] ?? null,
      extracted_images: uploadedImages,
    });

  } catch (e) {
    console.error('scrape error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
