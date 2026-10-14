# AI 私人管家 Demo

> 温暖、专业、不打扰的微信生活助手（开发中的 MVP）

## 当前完成度（诚实版）

- [x] 基础对话功能（DeepSeek）
- [x] 任务时间提取（DeepSeek 提取 JSON）
- [x] SQLite 数据存储（用户/对话/习惯/提醒）
- [x] 微信服务器签名验证、被动回复（收到消息后回复）
- [x] 定时提醒框架（node-cron 每分钟扫描）
- [x] 到期提醒会通过 `WechatService` 实例调用客服消息接口，发送成功后标记 `last_sent`
- [ ] **微信侧权限**：客服消息仍要求已认证公众号，且用户在 48 小时内与公众号有过互动；代码路径已接通，平台拒绝时不会把提醒标成已发送
- [ ] 习惯学习算法（目前只有关键词记录）
- [ ] 语音识别集成
- [ ] 小程序界面

## 🎯 核心功能

1. **智能对话** - 基于 DeepSeek，温暖陪伴
2. **任务提醒** - 自动提取时间，到期后主动推送（发送成功才记为已发送）
3. **习惯记忆** - 学习用户习惯，个性化服务
4. **主动关怀** - 按时提醒吃饭、运动、睡觉（依赖微信客服消息权限）

## 🚀 本地运行

环境要求：Node.js 18+（sqlite3 需要能编译或下载预编译二进制）

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量（必须）
cp .env.example .env
# 编辑 .env，填入 DEEPSEEK_API_KEY、WECHAT_TOKEN、WECHAT_APPID、WECHAT_APPSECRET
# 任一项缺失或为空白时，npm start 会立即退出并打印缺少的变量名

# 3. 运行测试
npm test

# 4. 启动服务（默认端口 3100，可用 PORT 覆盖）
npm start

# 5. 不接微信也可直接测试对话（需要有效的 DEEPSEEK_API_KEY）
curl -X POST http://localhost:3100/test/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "明天下午3点提醒我开会"}'
```

健康检查：`GET http://localhost:3100/health`

数据库文件 `butler.db` 会在首次启动时自动创建，已在 `.gitignore` 中忽略，不入库。

## 📱 微信公众号接入

### 配置服务器

1. 微信公众平台 -> 基本配置
2. 服务器地址：`http://your-domain.com/wechat`
3. Token：在 `.env` 中配置 `WECHAT_TOKEN`（自定义一个随机字符串，与公众平台填写的保持一致，勿使用示例值或提交到仓库）。若公众平台里仍在使用曾经写入仓库的默认 Token，请立刻换成新值。
4. 消息加解密方式：明文模式

### 测试

向公众号发送消息：
- "明天下午3点开会" → 自动创建提醒；到点后由提醒服务推送，成功后标记已发送
- "你好" → 温暖对话

## 🏗️ 项目结构

```
ai-butler-demo/
├── app.js              # 主服务
├── config.js           # 配置文件（全部从 .env 读取）
├── database.js         # 数据库操作
├── deepseek.js         # AI 服务
├── wechat.js           # 微信接口
├── reminder.js         # 提醒服务
├── test/               # 单元测试（node:test）
├── test.js             # 手动集成测试脚本（需要真实 API Key）
└── README.md           # 说明文档
```

## 🧪 测试

```bash
npm test          # 单元测试，不依赖网络和 API Key
node test.js      # 手动集成测试，需要 .env 中配置真实 DEEPSEEK_API_KEY
```

## 🤖 管家人格

- 🌟 温柔体贴，像家人一样
- 🎯 专业细致，记住用户习惯
- 🔔 适度主动，不过度打扰
- 💬 善于倾听，提供情感支持

## 📝 License

MIT

---

**作者：** 贾维斯（老韩的私人助手）
**更新：** 2026-08-28
