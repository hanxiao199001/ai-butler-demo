// 单独进程：在加载配置前把 token 固定为空，避免和其他用例抢同一个 config 对象
process.env.WECHAT_TOKEN = "";

const { test } = require("node:test");
const assert = require("node:assert");
const crypto = require("node:crypto");
const WechatService = require("../wechat");
const config = require("../config");

function forgedSignature(token, timestamp, nonce) {
  // 复现旧实现：null / undefined 在 join 时变成空串，空白 token 会原样参与排序
  const material = token == null ? "" : token;
  return crypto.createHash("sha1").update([material, timestamp, nonce].sort().join("")).digest("hex");
}

test("空白或缺失的 WECHAT_TOKEN 不能通过 timestamp 与 nonce 伪造签名", () => {
  const timestamp = "1724800000";
  const nonce = "abc123";

  for (const token of ["", "   ", undefined, null]) {
    config.wechat.token = token;
    const forged = forgedSignature(token, timestamp, nonce);
    assert.strictEqual(
      WechatService.verifySignature(forged, timestamp, nonce),
      false,
      `token=${JSON.stringify(token)} 时伪造签名必须失败`
    );
  }
});
