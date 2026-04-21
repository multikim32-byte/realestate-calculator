import type { UnsoldApt } from '../../data/unsoldApts';
import Link from 'next/link';
import { MapPin, Lightbulb, Star } from 'lucide-react';

const fmt = (n: number) => (n / 10000).toFixed(0) + '억';

export default function UnsoldAptCard({ apt }: { apt: UnsoldApt }) {
  return (
    <div className={`bg-white rounded-xl overflow-hidden flex flex-col h-full transition-all duration-200 ${
      apt.highlight
        ? 'border-2 border-blue-500 shadow-md'
        : 'border border-gray-200 hover:border-blue-300 hover:shadow-md'
    }`}>

      {/* 상단 배지 영역 */}
      <div className="p-4 pb-0 flex items-center gap-2">
        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-100 text-red-600">
          {apt.tag}
        </span>
        {apt.highlight && (
          <span className="flex items-center gap-1 text-xs font-semibold text-amber-500 ml-auto">
            <Star size={12} fill="#f59e0b" />
            주목 단지
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        {/* 단지명 */}
        <h3 className="text-base font-bold text-gray-900 mb-1 leading-snug line-clamp-2">
          {apt.name}
        </h3>
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-4">
          <MapPin size={12} className="shrink-0" />
          <span className="line-clamp-1">{apt.location}</span>
        </div>

        {/* 2열 정보 그리드 */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
          {[
            ['잔여 세대', `${apt.remainingUnits.toLocaleString()}세대 / 총 ${apt.totalUnits.toLocaleString()}세대`],
            ['분양가', `${fmt(apt.minPrice * 10000)} ~ ${fmt(apt.maxPrice * 10000)}`],
            ['면적', apt.area],
            ['잔여율', `${Math.round((apt.remainingUnits / apt.totalUnits) * 100)}%`],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-gray-400 mb-0.5">{label}</p>
              <p className="text-sm font-semibold text-gray-700">{value}</p>
            </div>
          ))}
        </div>

        {/* 혜택 */}
        <div className="flex items-start gap-2 bg-blue-50 rounded-lg px-3 py-2.5 mb-4">
          <Lightbulb size={14} className="shrink-0 mt-0.5 text-blue-500" />
          <span className="text-xs font-semibold text-blue-700">{apt.benefit}</span>
        </div>

        {/* 버튼 */}
        <div className="flex gap-2 mt-auto">
          <a
            href={apt.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center py-2 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-gray-700 transition-colors"
            style={{ textDecoration: 'none' }}
          >
            공식 분양 페이지 →
          </a>
          <Link
            href="/#취득세"
            className="flex-1 text-center py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-100 hover:bg-blue-100 transition-colors"
            style={{ textDecoration: 'none' }}
          >
            취득세 계산하기
          </Link>
        </div>
      </div>
    </div>
  );
}
