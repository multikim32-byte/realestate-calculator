'use client';

import { SaleItem } from '@/lib/types';
import { MapPin, Calendar, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SaleCardProps {
  item: SaleItem;
}

const statusColors: Record<string, string> = {
  '청약예정': 'bg-blue-100 text-blue-700',
  '청약중': 'bg-green-100 text-green-700',
  '당첨발표': 'bg-orange-100 text-orange-700',
  '선착순분양': 'bg-red-100 text-red-700',
  '완료': 'bg-gray-100 text-gray-400',
  '완판': 'bg-gray-100 text-gray-400',
};


function formatPrice(price: number) {
  if (!price) return '-';
  if (price >= 10000) {
    const eok = Math.floor(price / 10000);
    const rest = price % 10000;
    return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만원` : `${eok}억원`;
  }
  return `${price.toLocaleString()}만원`;
}

export default function SaleCard({ item }: SaleCardProps) {
  const floors = (item as any).floors;
  const router = useRouter();

  function handleClick() {
    try {
      sessionStorage.setItem(`sale_item_${item.id}`, JSON.stringify(item));
    } catch {
      // sessionStorage 실패 시 무시
    }
    router.push(`/sale/${item.id}`);
  }

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer h-full flex flex-col"
    >
      {/* 내용 */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[item.status] || 'bg-gray-100 text-gray-600'}`}>
            {item.status}
          </span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {item.buildingType}
          </span>
        </div>
        <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-2 line-clamp-2">
          {item.name}
        </h3>

        <div className="flex items-start gap-1 text-xs text-gray-500 mb-1">
          <MapPin size={12} className="shrink-0 mt-0.5" />
          <span className="line-clamp-1">{item.location || item.region}</span>
        </div>

        <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
          <Users size={12} />
          <span>총 {item.totalUnits ? item.totalUnits.toLocaleString() : '-'}세대</span>
          {floors ? (
            <>
              <span className="mx-0.5">·</span>
              <span>{floors}층</span>
            </>
          ) : null}
        </div>

        <div className="border-t border-gray-100 pt-3 mt-auto">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-400">분양가</p>
              <p className="text-sm font-bold text-blue-600">
                {item.minPrice ? `${formatPrice(item.minPrice)} ~` : '미정'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">접수 시작</p>
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <Calendar size={11} />
                <span>{item.receiptStart || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 flex gap-1 flex-wrap">
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {item.supplyType}
          </span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {item.recruitType}
          </span>
        </div>
      </div>
    </div>
  );
}
