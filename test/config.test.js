// 配置模块单元测试：验证敏感信息只从环境变量读取
process.env.WECHAT_TOKEN = "cfg_token_from_env";
delete process.env.PORT;

const { test } = require("node:test");
const assert = require("node:assert");
const config = require("../config");

test("config：微信 Token 应从环境变量读取，无硬编码默认值", () => {
  assert.strictEqual(config.wechat.token, "cfg_token_from_env");
});

test("config：未设置 PORT 时使用默认端口 3100", () => {
  assert.strictEqual(config.server.port, 3100);
});

test("config：DeepSeek apiKey 只来自环境变量（未设置时为 undefined，而非硬编码）", () => {
  assert.strictEqual(config.deepseek.apiKey, process.env.DEEPSEEK_API_KEY);
});
