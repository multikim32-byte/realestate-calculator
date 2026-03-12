export interface SaleItem {
  id: string;
  name: string;
  location: string;
  region: string;
  district: string;
  buildingType: '아파트' | '오피스텔' | '도시형생활주택' | '상업시설';
  supplyType: '민간분양' | '공공분양' | '임대';
  recruitType: '신규공급' | '선착순';
  totalUnits: number;
  minPrice: number;
  maxPrice: number;
  receiptStart: string;
  receiptEnd: string;
  announcementDate: string;
  winnerDate: string;
  moveInDate: string;
  status: '청약예정' | '청약중' | '당첨발표' | '선착순분양' | '완판';
  lat: number;
  lng: number;
  imageUrl?: string;
  floors: number;
  units: UnitType[];
}

export interface UnitType {
  type: string;
  area: number;
  count: number;
  price: number;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  url: string;
  category: string;
}

export type Region = '전체' | '서울' | '경기' | '인천' | '부산' | '대구' | '광주' | '대전' | '울산' | '세종' | '강원' | '충북' | '충남' | '전북' | '전남' | '경북' | '경남' | '제주';
export type BuildingType = '전체' | '아파트' | '오피스텔' | '도시형생활주택' | '상업시설';
export type SupplyType = '전체' | '민간분양' | '공공분양' | '임대';
export type SaleStatus = '전체' | '청약예정' | '청약중' | '당첨발표' | '선착순분양';
