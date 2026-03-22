// api/review.js
// Handles: GET /api/review?id=xxx&action=approve|reject
// Called from WeChat notification link
// Returns a simple HTML confirmation page

import { Redis } from '@upstash/redis';
const kv = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const FEISHU_WEBHOOK = process.env.FEISHU_WEBHOOK_URL;

export default async function handler(req, res) {
  const { id, action } = req.query || {};

  if (!id || !['approve', 'reject'].includes(action)) {
    return html(res, 400, '❌ 参数错误', '链接无效，请检查通知消息中的链接。');
  }

  // Fetch the entry
  const entry = await kv.get(id);
  if (!entry) {
    return html(res, 404, '❌ 找不到这条投稿', '它可能已被处理过了。');
  }
  if (entry.type !== 'caption') {
    return html(res, 400, '❌ 不是台词投稿', '');
  }
  if (entry.status !== 'pending') {
    const label = entry.status === 'approved' ? '✅ 已通过' : '❌ 已拒绝';
    return html(res, 200, `${label} 已处理`, `这条台词之前已被标记为「${entry.status}」，无需重复操作。`);
  }

  if (action === 'approve') {
    // Update entry status
    entry.status = 'approved';
    entry.approvedAt = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    await kv.set(id, entry);

    // Add to approved set + captions list
    await kv.srem('captions:pending', id);
    await kv.sadd('captions:approved', id);
    // Store in a list for easy frontend fetching
    await kv.lpush('captions:approved:list', entry.text);

    // Notify
    if (FEISHU_WEBHOOK) {
      await notify(`✅ 台词已通过并加入台词库\n> ${entry.text}`);
    }

    return html(res, 200, '✅ 台词已通过！', `「${entry.text}」已自动加入台词库，下次刷新页面就会出现。`);
  } else {
    // Reject
    entry.status = 'rejected';
    await kv.set(id, entry);
    await kv.srem('captions:pending', id);

    if (FEISHU_WEBHOOK) {
      await notify(`❌ 台词已拒绝\n> ${entry.text}`);
    }

    return html(res, 200, '❌ 台词已拒绝', `「${entry.text}」已标记为拒绝，不会出现在台词库中。`);
  }
}

async function notify(content) {
  try {
    await fetch(FEISHU_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msg_type: 'text',
        content: { text: content },
      }),
    });
  } catch (e) {
    console.error('Feishu notify failed:', e);
  }
}

function html(res, status, title, body) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(status).send(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · 答案之书</title>
<style>
  body{font-family:'PingFang SC','Microsoft YaHei',sans-serif;background:#f5ede0;
    display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
  .card{background:#fdf8f0;border:1px solid rgba(160,120,60,.18);border-radius:8px;
    padding:40px 32px;text-align:center;max-width:360px;width:90%;
    box-shadow:0 8px 32px rgba(28,21,16,.1);}
  h1{font-size:22px;color:#362818;margin:0 0 12px;}
  p{font-size:14px;color:#5a4230;line-height:1.8;margin:0 0 24px;}
  a{display:inline-block;background:#362818;color:#d4aa60;text-decoration:none;
    font-size:13px;padding:10px 28px;border-radius:30px;letter-spacing:.1em;}
</style>
</head>
<body>
<div class="card">
  <h1>${title}</h1>
  <p>${body}</p>
  <a href="javascript:window.close()">关 闭</a>
</div>
</body>
</html>`);
}
