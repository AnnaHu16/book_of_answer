# 答案之书 · 部署指南

## 项目结构

```
book-of-answers/
├── api/
│   ├── submit.js      # 接收留言 & 台词投稿，推送企业微信通知
│   ├── review.js      # 审核台词（通过/拒绝），点通知里的链接触发
│   ├── captions.js    # 前端拉取已通过的台词
│   └── likes.js       # 点赞计数
├── public/
│   └── index.html     # 主页面
├── vercel.json
└── package.json
```

---

## 第一步：推送到 GitHub

```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/你的用户名/book-of-answers.git
git push -u origin main
```

---

## 第二步：Vercel 部署

1. 打开 [vercel.com](https://vercel.com)，Import 你的 GitHub 仓库
2. Framework Preset 选 **Other**，其他默认，点 Deploy

---

## 第三步：创建 Upstash Redis 数据库

1. 打开 [upstash.com](https://upstash.com)，注册免费账号（用 GitHub 登录最快）
2. 进入 Console → **Create Database**
   - Name：随便起，比如 `book-answers`
   - Type：**Regional**（免费套餐）
   - Region：选 `ap-east-1`（香港）或 `ap-northeast-1`（东京），离你近就好
3. 创建后，在数据库详情页找到 **REST API** 部分，复制两个值：
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. 填入 Vercel 环境变量（见第四步）

---

## 第四步：配置企业微信机器人

### 获取飞书机器人 Webhook URL
1. 手机或电脑打开飞书，**新建一个群**（可以就你自己一个人，或者拉个小号进来）
2. 点群设置 → **群机器人** → **添加机器人** → **自定义机器人**
3. 起个名字（比如"答案之书"），点添加，复制生成的 **Webhook URL**

### 填入 Vercel 环境变量
1. Vercel 项目页面 → **Settings** → **Environment Variables**
2. 添加以下变量：

| 变量名 | 值 |
|--------|-----|
| `FEISHU_WEBHOOK_URL` | 飞书机器人 Webhook URL |
| `BASE_URL` | `https://你的域名.vercel.app` |
| `UPSTASH_REDIS_REST_URL` | Upstash 数据库详情页的 REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash 数据库详情页的 REST Token |

3. 保存后 **Redeploy** 一次让环境变量生效

---

## 使用说明

### 收到留言通知
飞书会收到一张卡片消息（蓝色标题）：

> **答案之书 · 新留言**
> **💬 新留言** 🔒 仅你可见
> 这个工具太好用了！
> 🕐 2025/1/1 12:00:00

### 收到台词投稿通知
飞书会收到一张卡片消息（金色标题），带两个按钮：

> **答案之书 · 台词投稿**
> **✨ 新台词投稿**
> 宇宙说你可以再摸5分钟
> 🕐 2025/1/1 12:00:00
> ————————————
> **[✅ 通过，加入台词库]**　　**[❌ 拒绝]**

直接点按钮即可，通过后台词自动加入库。

---

## 常见问题

**Q: 通过后台词多久出现？**  
A: 前端每次加载页面时会请求 `/api/captions`，60秒缓存，点通过后刷新页面即可看到。

**Q: 点赞数是全局共享的吗？**  
A: 是的，所有用户的点赞累加到同一个计数器。每个用户的"是否已赞"状态存在本地 localStorage。

**Q: KV 免费套餐够用吗？**  
A: Vercel KV 免费套餐有 30MB 存储 + 每月 30 万次请求，日常小工具完全够用。
