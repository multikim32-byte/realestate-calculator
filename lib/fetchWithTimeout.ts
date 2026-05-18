type NextFetchInit = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] };
};

const DEFAULT_MS = 8_000;

export async function fetchWithTimeout(
  url: string,
  options: NextFetchInit = {},
  timeoutMs = DEFAULT_MS,
): Promise<Response> {
  try {
    return await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    if (e instanceof Error && e.name === 'TimeoutError') {
      throw new Error(`API 응답 시간 초과 (${timeoutMs / 1000}초): ${url.split('?')[0]}`);
    }
    throw e;
  }
}
