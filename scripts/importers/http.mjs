// Shared fetch helper for importers: identifies itself, retries politely, fails loudly.
export const USER_AGENT = 'WorldAtlasDataBuilder/0.2 (open-data importer)';

export async function getJson(url, { headers = {}, retries = 3, timeoutMs = 70_000 } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...headers }, signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) {
        const err = new Error(`${res.status} ${res.statusText}`);
        err.retryAfter = Number(res.headers.get('retry-after')) || 0; // seconds, sent with 429/503
        throw err;
      }
      return await res.json();
    } catch (e) {
      if (attempt >= retries) throw new Error(`GET ${url} failed after ${attempt} attempts: ${e.message}`, { cause: e });
      await new Promise((r) => setTimeout(r, Math.max(2000 * attempt, (e.retryAfter ?? 0) * 1000 * attempt)));
    }
  }
}
