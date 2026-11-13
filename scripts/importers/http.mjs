// Shared fetch helper for importers: identifies itself, retries politely, fails loudly.
export const USER_AGENT = 'WorldAtlasDataBuilder/0.2 (open-data importer)';

export async function getJson(url, { headers = {}, retries = 3 } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...headers } });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.json();
    } catch (e) {
      if (attempt >= retries) throw new Error(`GET ${url} failed after ${attempt} attempts: ${e.message}`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}
