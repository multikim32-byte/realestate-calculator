import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from '@/lib/webpush';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 매일 오전 9시(KST) Vercel Cron이 호출하는 엔드포인트
// CRON_SECRET으로 무단 호출 차단
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 내일(한국 기준) 날짜 계산: 크론이 00:00 UTC(=09:00 KST)에 실행
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

  const { data: subs } = await admin.from('push_subscriptions').select('*');
  if (!subs || subs.length === 0) return NextResponse.json({ sent: 0 });

  let sent = 0;
  const expired: string[] = [];

  for (const sub of subs) {
    const items = (sub.items ?? []) as { id: string; name: string; receiptStart: string; location: string }[];
    const targets = items.filter(i => i.receiptStart === tomorrowStr);
    if (targets.length === 0) continue;

    for (const item of targets) {
      const payload = JSON.stringify({
        title: `🔔 내일 청약 시작 — ${item.name}`,
        body: `${item.location} 청약이 내일(${tomorrowStr}) 시작됩니다!`,
        url: `/sale/${item.id}`,
      });

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err: any) {
        // 410/404 = 구독 만료 → 삭제 대상
        if (err.statusCode === 410 || err.statusCode === 404) expired.push(sub.id);
      }
    }
  }

  if (expired.length > 0) {
    await admin.from('push_subscriptions').delete().in('id', expired);
  }

  return NextResponse.json({ sent, cleaned: expired.length, date: tomorrowStr });
}
