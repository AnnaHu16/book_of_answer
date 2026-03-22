// api/captions.js
// GET /api/captions
// Returns all approved captions so the frontend can merge with built-in list

import { Redis } from '@upstash/redis';
const kv = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  try {
    // lrange returns all items pushed via lpush
    const list = await kv.lrange('captions:approved:list', 0, -1);
    return res.status(200).json({ captions: list || [] });
  } catch (e) {
    console.error('KV error:', e);
    return res.status(200).json({ captions: [] }); // graceful fallback
  }
}
