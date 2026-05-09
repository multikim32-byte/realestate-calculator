/** 만원 단위 숫자 → "X억 Y만원" */
export function formatPrice(price: number): string {
  if (!price) return '-';
  if (price >= 10000) {
    const eok = Math.floor(price / 10000);
    const rest = price % 10000;
    return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만원` : `${eok}억원`;
  }
  return `${price.toLocaleString()}만원`;
}

/** 만원 단위 숫자 → 카드용 짧은 형식 "X억 Y천Z백만원" */
export function formatPriceCard(price: number): string {
  if (!price) return '-';
  const eok = Math.floor(price / 10000);
  const rest = price % 10000;
  const chun = Math.floor(rest / 1000);
  const baek = Math.round((rest % 1000) / 100) * 100;
  let s = '';
  if (eok > 0) s += `${eok}억 `;
  if (chun > 0) s += `${chun}천`;
  if (baek > 0) s += `${baek}`;
  if (s.endsWith(' ')) s = s.trim();
  return s ? s + '만원' : '-';
}

/** 만원 단위 숫자 → 리스트용 짧은 형식 "X억 Y.Z천만" */
export function formatPriceShort(price: number): string {
  if (!price) return '-';
  const eok = Math.floor(price / 10000);
  const rest = price % 10000;
  if (eok > 0 && rest > 0) return `${eok}억 ${Math.round(rest / 100) * 100 > 0 ? `${(rest / 1000).toFixed(1)}천` : ''}만`;
  if (eok > 0) return `${eok}억`;
  return `${price.toLocaleString()}만`;
}

/** 원(raw) 단위 숫자 → "X억" / "X만" / "X원" */
export function formatWon(value: number): string {
  if (value >= 100000000) return `${(value / 100000000).toFixed(1)}억`;
  if (value >= 10000) return `${Math.floor(value / 10000).toLocaleString()}만`;
  return `${value.toLocaleString()}원`;
}
