'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import InstaCard, { type SaleItem, type UnsoldItem, type TradeStats, type CardType } from '../InstaCard';

const MAX_PAGES = 3;
const TRADE_TYPES: CardType[] = ['급등TOP10', '급락TOP10', '신고가TOP10', '거래량TOP10'];

function getWeekRange(): { start: string; end: string; label: string } {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
    label: `${fmt(monday)}(월) ~ ${fmt(sunday)}(일)`,
  };
}

function CardView() {
  const params = useSearchParams();
  const type = (params.get('type') ?? '오늘의청약') as CardType;
  const region = params.get('region') ?? '전국';
  const month = params.get('month') ?? '';
  const period = (params.get('period') ?? 'monthly') as 'monthly' | 'weekly';
  const page = parseInt(params.get('page') ?? '1', 10);

  const isTrade = TRADE_TYPES.includes(type);
  const week = getWeekRange();

  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [unsoldItems, setUnsoldItems] = useState<UnsoldItem[]>([]);
  const [tradeStats, setTradeStats] = useState<TradeStats>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isTrade) {
      fetch(`/api/admin/trade-stats?period=${period}`)
        .then(r => r.json())
        .then(data => { if (data) setTradeStats(data); })
        .finally(() => setLoading(false));
      return;
    }

    if (type === '미분양') {
      fetch('/api/admin/unsold')
        .then(r => r.json())
        .then(data => {
          setUnsoldItems((data as UnsoldItem[]).filter(item =>
            region === '전국' || item.location?.includes(region)
          ));
        })
        .finally(() => setLoading(false));
    } else {
      fetch('/api/sale?type=all&perPage=100')
        .then(r => r.json())
        .then(data => {
          const today = new Date().toISOString().slice(0, 10);
          const in3 = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
          const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

          if (type === '오늘의청약') {
            setSaleItems(
              (data.items ?? [])
                .filter((item: SaleItem) => {
                  if (!item.receiptStart || !item.receiptEnd) return false;
                  const ongoing = item.receiptStart <= today && item.receiptEnd >= today;
                  const upcoming = item.receiptStart > today && item.receiptStart <= in7;
                  return (ongoing || upcoming) && (region === '전국' || item.location?.includes(region));
                })
                .map((item: SaleItem): SaleItem => ({
                  ...item,
                  statusLabel: item.receiptEnd <= in3 ? '마감임박'
                    : item.receiptStart <= today ? '청약중' : '청약예정',
                }))
                .sort((a: SaleItem, b: SaleItem) => {
                  const order: Record<string, number> = { '마감임박': 0, '청약중': 1, '청약예정': 2 };
                  return (order[a.statusLabel ?? ''] ?? 3) - (order[b.statusLabel ?? ''] ?? 3);
                })
            );
          } else if (type === '이번주청약') {
            setSaleItems(
              (data.items ?? [])
                .filter((item: SaleItem) => {
                  if (!item.receiptStart || !item.receiptEnd) return false;
                  const overlap = item.receiptStart <= week.end && item.receiptEnd >= week.start;
                  return overlap && (region === '전국' || item.location?.includes(region));
                })
                .map((item: SaleItem): SaleItem => {
                  let statusLabel: string;
                  if (item.receiptStart <= today && item.receiptEnd <= in3) statusLabel = '마감임박';
                  else if (item.receiptStart <= today) statusLabel = '청약중';
                  else statusLabel = '청약예정';
                  return { ...item, statusLabel };
                })
                .sort((a: SaleItem, b: SaleItem) => {
                  const order: Record<string, number> = { '마감임박': 0, '청약중': 1, '청약예정': 2 };
                  return (order[a.statusLabel ?? ''] ?? 3) - (order[b.statusLabel ?? ''] ?? 3);
                })
            );
          } else {
            setSaleItems((data.items ?? []).filter((item: SaleItem) => {
              const inMonth = !month || item.receiptStart?.startsWith(month);
              return inMonth && (region === '전국' || item.location?.includes(region));
            }));
          }
        })
        .finally(() => setLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, region, month, period, isTrade]);

  const allItems = type === '미분양' ? unsoldItems : saleItems;
  const totalPages = isTrade ? 1 : Math.min(MAX_PAGES, Math.ceil(allItems.length / 5));

  if (loading) {
    return (
      <div style={{ width: 1080, height: 1080, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', fontSize: 18, color: '#6b7280' }}>
        불러오는 중...
      </div>
    );
  }

  return (
    <InstaCard
      type={type} region={region} month={month}
      period={period} weekLabel={week.label}
      saleItems={saleItems} unsoldItems={unsoldItems}
      tradeStats={tradeStats}
      scale={1} page={page} totalPages={totalPages}
    />
  );
}

export default function InstaCardViewPage() {
  return (
    <div style={{ width: 1080, height: 1080, overflow: 'hidden' }}>
      <Suspense>
        <CardView />
      </Suspense>
    </div>
  );
}
