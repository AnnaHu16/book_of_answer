// api/likes.js
// GET  /api/likes        → { count: N }
// POST /api/likes        → { delta: 1|-1 }  → { count: N }

import { Redis } from '@upstash/redis';
const kv = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const count = (await kv.get('book:likes')) || 0;
    return res.status(200).json({ count });
  }

  if (req.method === 'POST') {
    const { delta } = req.body || {};
    if (delta !== 1 && delta !== -1) return res.status(400).json({ error: 'invalid delta' });
    const count = await kv.incrby('book:likes', delta);
    const safe  = Math.max(0, count);
    if (safe !== count) await kv.set('book:likes', safe);
    return res.status(200).json({ count: safe });
  }

  return res.status(405).end();
}
