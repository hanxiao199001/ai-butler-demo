// 微信服务纯函数单元测试（不依赖网络）
process.env.WECHAT_TOKEN = process.env.WECHAT_TOKEN || "unit_test_token";

const { test } = require("node:test");
const assert = require("node:assert");
const crypto = require("node:crypto");
const WechatService = require("../wechat");
const config = require("../config");

function sign(token, timestamp, nonce) {
  const str = [token, timestamp, nonce].sort().join("");
  return crypto.createHash("sha1").update(str).digest("hex");
}

test("verifySignature：正确签名应返回 true", () => {
  const timestamp = "1724800000";
  const nonce = "abc123";
  const signature = sign(config.wechat.token, timestamp, nonce);
  assert.strictEqual(WechatService.verifySignature(signature, timestamp, nonce), true);
});

test("verifySignature：错误签名应返回 false", () => {
  assert.strictEqual(
    WechatService.verifySignature("deadbeef", "1724800000", "abc123"),
    false
  );
});

test("verifySignature：缺少参数时应返回 false", () => {
  assert.strictEqual(WechatService.verifySignature(undefined, undefined, undefined), false);
});

test("buildTextMessage：应包含收发方与文本内容", () => {
  const xml = WechatService.buildTextMessage("user_openid", "gh_account", "你好，管家");
  assert.match(xml, /<ToUserName><!\[CDATA\[user_openid\]\]><\/ToUserName>/);
  assert.match(xml, /<FromUserName><!\[CDATA\[gh_account\]\]><\/FromUserName>/);
  assert.match(xml, /<MsgType><!\[CDATA\[text\]\]><\/MsgType>/);
  assert.match(xml, /<Content><!\[CDATA\[你好，管家\]\]><\/Content>/);
});

test("buildTextMessage：CreateTime 应为秒级时间戳", () => {
  const before = Math.floor(Date.now() / 1000);
  const xml = WechatService.buildTextMessage("a", "b", "c");
  const m = xml.match(/<CreateTime>(\d+)<\/CreateTime>/);
  assert.ok(m, "应包含 CreateTime");
  const ts = Number(m[1]);
  assert.ok(ts >= before && ts <= before + 5, "时间戳应接近当前时间");
});

test("parseXML：应能解析微信文本消息", async () => {
  const xml = `<xml>
    <ToUserName><![CDATA[gh_account]]></ToUserName>
    <FromUserName><![CDATA[user_openid]]></FromUserName>
    <CreateTime>1724800000</CreateTime>
    <MsgType><![CDATA[text]]></MsgType>
    <Content><![CDATA[明天下午3点开会]]></Content>
  </xml>`;
  const msg = await WechatService.parseXML(xml);
  assert.strictEqual(msg.MsgType, "text");
  assert.strictEqual(msg.FromUserName, "user_openid");
  assert.strictEqual(msg.Content, "明天下午3点开会");
});

test("buildTextMessage 与 parseXML 往返应保持内容一致", async () => {
  const xml = WechatService.buildTextMessage("to_x", "from_y", "该吃午饭了");
  const msg = await WechatService.parseXML(xml);
  assert.strictEqual(msg.ToUserName, "to_x");
  assert.strictEqual(msg.FromUserName, "from_y");
  assert.strictEqual(msg.Content, "该吃午饭了");
});
