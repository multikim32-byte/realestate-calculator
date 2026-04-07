export type UnsoldApt = {
  id: number;
  name: string;
  location: string;
  totalUnits: number;
  remainingUnits: number;
  minPrice: number; // 만원 단위
  maxPrice: number;
  area: string;
  benefit: string;
  officialUrl: string;
  tag: string;
  highlight: boolean;
};

export const unsoldApts: UnsoldApt[] = [
  {
    id: 1,
    name: "예시 더샵 리버파크",
    location: "경북 구미시 공단동",
    totalUnits: 842,
    remainingUnits: 213,
    minPrice: 28000,
    maxPrice: 45000,
    area: "84㎡ ~ 115㎡",
    benefit: "계약금 정액제(1,000만원) + 중도금 무이자",
    officialUrl: "https://example.com",
    tag: "중도금무이자",
    highlight: true,
  },
  {
    id: 2,
    name: "예시 롯데캐슬 파크뷰",
    location: "충남 천안시 서북구 불당동",
    totalUnits: 1200,
    remainingUnits: 87,
    minPrice: 32000,
    maxPrice: 52000,
    area: "59㎡ ~ 84㎡",
    benefit: "발코니 확장 무상 + 시스템에어컨 기본 제공",
    officialUrl: "https://example.com",
    tag: "발코니무상",
    highlight: false,
  },
  {
    id: 3,
    name: "예시 e편한세상 스카이파크",
    location: "전남 여수시 웅천동",
    totalUnits: 560,
    remainingUnits: 342,
    minPrice: 18000,
    maxPrice: 28000,
    area: "59㎡ ~ 99㎡",
    benefit: "중도금 60% 무이자 + 잔금 1년 유예",
    officialUrl: "https://example.com",
    tag: "잔금유예",
    highlight: true,
  },
];
