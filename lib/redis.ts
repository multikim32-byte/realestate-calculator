import { Redis } from '@upstash/redis';

let client: Redis | null = null;

function getClient(): Redis | null {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!client) client = new Redis({ url, token });
  return client;
}

// 현재 월이면 2시간, 과거 월이면 7일 캐시
export function getMolitTtl(dealYmd: string): number {
  const now = new Date();
  const curYm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  return dealYmd >= curYm ? 2 * 3600 : 7 * 24 * 3600;
}

export async function withCache<T>(
  key: string,
  ttlSec: number,
  fn: () => Promise<T>,
): Promise<T> {
  const r = getClient();
  if (r) {
    try {
      const cached = await r.get<T>(key);
      if (cached !== null) return cached;
    } catch { /* Redis 장애 시 통과 */ }
  }
  const data = await fn();
  if (r) {
    try { await r.set(key, data, { ex: ttlSec }); } catch {}
  }
  return data;
}
