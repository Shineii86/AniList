// ===== API Cache with TTL =====
import { ANILIST_API_URL, CACHE_TTL } from './config.js';

const apiCache = new Map();

function getCached(key) {
  const entry = apiCache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  apiCache.delete(key);
  return null;
}

function setCache(key, data) {
  apiCache.set(key, { data, ts: Date.now() });
  if (apiCache.size > 100) {
    const oldest = apiCache.keys().next().value;
    apiCache.delete(oldest);
  }
}

// ===== API Functions =====
export async function fetchFromAniList(query, variables = {}) {
  const cacheKey = JSON.stringify({ query: query.trim().substring(0, 80), variables });
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(ANILIST_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query, variables })
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    if (data.errors) throw new Error(data.errors[0].message);
    setCache(cacheKey, data.data);
    return data.data;
  } catch (error) {
    console.error('AniList API Error:', error);
    throw error;
  }
}
