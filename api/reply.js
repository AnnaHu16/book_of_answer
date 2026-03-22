// api/reply.js
// POST /api/reply  { commentId, text }
// Appends a reply to the comment's replies array

import { Redis } from '@upstash/redis';
const kv = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const NICKNAMES = [
  '喝咖啡的加菲','打盹的橘猫','失眠的布偶','翻垃圾桶的奶牛',
  '偷吃的三花','盯着墙的玳瑁','发呆的暹罗','追尾巴的英短',
  '啃键盘的折耳','蹲门口的黑猫','嗅地图的柯基','追快递的哈士奇',
  '偷外卖的金毛','晒太阳的萨摩','嗷嗷叫的边牧','睡午觉的阿拉斯加',
  '咬拖鞋的腊肠','抢沙发的松狮','盯鸽子的法斗','溜达的秋田',
  '研究猫薄荷的波斯','蹲冰箱的布偶','守财奴橘猫','哲学家黑猫',
  '追激光笔的银渐层','打呼噜的加菲','偷被窝的田园犬','蹭腿的柴柴',
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { commentId, text } = req.body || {};
  if (!commentId || !text || text.trim().length === 0)
    return res.status(400).json({ error: 'Missing fields' });
  if (text.length > 200)
    return res.status(400).json({ error: 'Too long' });

  const raw = await kv.get(commentId);
  if (!raw) return res.status(404).json({ error: 'Comment not found' });

  const comment = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (comment.visibility !== 'public')
    return res.status(403).json({ error: 'Not a public comment' });

  const nickname = NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)];
  const reply = {
    id: `reply-${Date.now()}-${Math.random().toString(36).slice(2,5)}`,
    nickname,
    text: text.trim(),
    time: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
  };

  if (!Array.isArray(comment.replies)) comment.replies = [];
  comment.replies.push(reply);
  await kv.set(commentId, JSON.stringify(comment));

  return res.status(200).json({ ok: true, reply });
}
