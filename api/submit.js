// api/submit.js
// Handles: POST /api/submit
// Body: { type: 'comment'|'caption', text, visibility? }
// - Saves to Vercel KV
// - Pushes Feishu (Lark) robot notification

import { Redis } from '@upstash/redis';
const kv = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const FEISHU_WEBHOOK = process.env.FEISHU_WEBHOOK_URL;
const BASE_URL       = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : process.env.BASE_URL || 'http://localhost:3000';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, text, visibility } = req.body || {};

  if (!type || !text || text.trim().length === 0) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  if (text.length > 300) {
    return res.status(400).json({ error: 'Text too long' });
  }

  const id  = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

  const entry = {
    id, type, text: text.trim(),
    visibility: type === 'comment' ? (visibility || 'private') : undefined,
    status: type === 'caption' ? 'pending' : undefined,
    time: now,
  };

  await kv.set(id, entry);
  if (type === 'caption') {
    await kv.sadd('captions:pending', id);
  }

  if (FEISHU_WEBHOOK) {
    try {
      await sendFeishu(entry);
    } catch (e) {
      console.error('Feishu push failed:', e);
    }
  }

  return res.status(200).json({ ok: true });
}

async function sendFeishu(entry) {
  let elements = [];

  if (entry.type === 'comment') {
    const visLabel = entry.visibility === 'public' ? '🌍 公开可见' : '🔒 仅你可见';
    elements = [
      { tag: 'div', text: { tag: 'lark_md', content: `**💬 新留言** ${visLabel}` } },
      { tag: 'div', text: { tag: 'lark_md', content: `> ${entry.text}` } },
      { tag: 'div', text: { tag: 'lark_md', content: `🕐 ${entry.time}` } },
    ];
  } else {
    const approveUrl = `${BASE_URL}/api/review?id=${encodeURIComponent(entry.id)}&action=approve`;
    const rejectUrl  = `${BASE_URL}/api/review?id=${encodeURIComponent(entry.id)}&action=reject`;
    elements = [
      { tag: 'div', text: { tag: 'lark_md', content: `**✨ 新台词投稿**` } },
      { tag: 'div', text: { tag: 'lark_md', content: `> ${entry.text}` } },
      { tag: 'div', text: { tag: 'lark_md', content: `🕐 ${entry.time}` } },
      { tag: 'hr' },
      {
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '✅ 通过，加入台词库' },
            type: 'primary',
            url: approveUrl,
          },
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '❌ 拒绝' },
            type: 'danger',
            url: rejectUrl,
          },
        ],
      },
    ];
  }

  await fetch(FEISHU_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      msg_type: 'interactive',
      card: {
        header: {
          title: {
            tag: 'plain_text',
            content: entry.type === 'comment' ? '答案之书 · 新留言' : '答案之书 · 台词投稿',
          },
          template: entry.type === 'comment' ? 'blue' : 'gold',
        },
        elements,
      },
    }),
  });
}
