// 配置模块单元测试：验证敏感信息只从环境变量读取
process.env.WECHAT_TOKEN = "cfg_token_from_env";
delete process.env.PORT;

const { test } = require("node:test");
const assert = require("node:assert");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const config = require("../config");

const COMPLETE_ENV = {
  WECHAT_TOKEN: "token_test",
  WECHAT_APPID: "wx_test",
  WECHAT_APPSECRET: "secret_test",
  DEEPSEEK_API_KEY: "sk_test"
};

test("config：微信 Token 应从环境变量读取，无硬编码默认值", () => {
  assert.strictEqual(config.wechat.token, "cfg_token_from_env");
});

test("config：未设置 PORT 时使用默认端口 3100", () => {
  assert.strictEqual(config.server.port, 3100);
});

test("config：DeepSeek apiKey 只来自环境变量（未设置时为 undefined，而非硬编码）", () => {
  assert.strictEqual(config.deepseek.apiKey, process.env.DEEPSEEK_API_KEY);
});

test("assertRequiredSecrets：缺失或空白的密钥应失败并点名变量", () => {
  assert.throws(
    () => config.assertRequiredSecrets({}),
    /WECHAT_TOKEN[\s\S]*WECHAT_APPID[\s\S]*WECHAT_APPSECRET[\s\S]*DEEPSEEK_API_KEY/
  );

  assert.throws(
    () => config.assertRequiredSecrets({ ...COMPLETE_ENV, WECHAT_TOKEN: "" }),
    /WECHAT_TOKEN/
  );

  assert.throws(
    () => config.assertRequiredSecrets({ ...COMPLETE_ENV, WECHAT_TOKEN: "   " }),
    /WECHAT_TOKEN/
  );

  assert.throws(
    () => config.assertRequiredSecrets({ ...COMPLETE_ENV, DEEPSEEK_API_KEY: " \n" }),
    /DEEPSEEK_API_KEY/
  );
});

test("assertRequiredSecrets：四项都是非空字符串时通过", () => {
  assert.doesNotThrow(() => config.assertRequiredSecrets({ ...COMPLETE_ENV }));
});

test("app.js 在 WECHAT_TOKEN 为空时立即退出，而不是开始监听", () => {
  const result = spawnSync(process.execPath, ["app.js"], {
    cwd: path.join(__dirname, ".."),
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      ...COMPLETE_ENV,
      WECHAT_TOKEN: ""
    },
    encoding: "utf8",
    timeout: 8000
  });

  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  assert.notStrictEqual(result.error && result.error.code, "ETIMEDOUT", output);
  assert.notStrictEqual(result.status, 0, output);
  assert.match(output, /WECHAT_TOKEN/);
  assert.doesNotMatch(output, /管家已就绪/);
});
