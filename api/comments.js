// api/comments.js
// GET /api/comments  → returns latest 50 public comments with replies

import { Redis } from '@upstash/redis';
const kv = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  try {
    // Get latest 50 comment IDs sorted by time desc
    const ids = await kv.zrange('comments:public', 0, 49, { rev: true });
    if (!ids || ids.length === 0) return res.status(200).json({ comments: [] });

    // Fetch all comment objects
    const raw = await Promise.all(ids.map(id => kv.get(id)));
    const comments = raw
      .map(r => {
        try { return typeof r === 'string' ? JSON.parse(r) : r; } catch { return null; }
      })
      .filter(Boolean);

    return res.status(200).json({ comments });
  } catch (e) {
    console.error('comments fetch error:', e);
    return res.status(200).json({ comments: [] });
  }
}
