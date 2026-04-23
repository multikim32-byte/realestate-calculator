import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PushItem {
  id: string;
  name: string;
  receiptStart: string;
  location: string;
}

// POST /api/push/subscribe — 구독 추가 또는 아이템 추가
export async function POST(req: NextRequest) {
  const { subscription, item } = await req.json() as { subscription: any; item: PushItem };

  if (!subscription?.endpoint || !item?.id || !item?.receiptStart) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const { endpoint } = subscription;
  const p256dh = subscription.keys?.p256dh;
  const auth = subscription.keys?.auth;

  const { data: existing } = await admin
    .from('push_subscriptions')
    .select('id, items')
    .eq('endpoint', endpoint)
    .maybeSingle();

  if (existing) {
    const items = (existing.items ?? []) as PushItem[];
    if (!items.some(i => i.id === item.id)) {
      await admin
        .from('push_subscriptions')
        .update({ items: [...items, item], updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    }
  } else {
    await admin.from('push_subscriptions').insert({ endpoint, p256dh, auth, items: [item] });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/push/subscribe — 아이템 구독 해제
export async function DELETE(req: NextRequest) {
  const { subscription, itemId } = await req.json() as { subscription: any; itemId: string };

  if (!subscription?.endpoint) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const { data: existing } = await admin
    .from('push_subscriptions')
    .select('id, items')
    .eq('endpoint', subscription.endpoint)
    .maybeSingle();

  if (!existing) return NextResponse.json({ ok: true });

  const remaining = (existing.items as PushItem[]).filter(i => i.id !== itemId);

  if (remaining.length === 0) {
    await admin.from('push_subscriptions').delete().eq('id', existing.id);
  } else {
    await admin.from('push_subscriptions').update({ items: remaining }).eq('id', existing.id);
  }

  return NextResponse.json({ ok: true });
}
