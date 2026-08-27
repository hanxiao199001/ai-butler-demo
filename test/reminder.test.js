// 提醒服务纯函数单元测试
process.env.WECHAT_TOKEN = process.env.WECHAT_TOKEN || "unit_test_token";

const { test, after } = require("node:test");
const assert = require("node:assert");
const reminder = require("../reminder");
const { db } = require("../database");

after(() => db.close());

test("getEmojiByType：已知类型返回对应 emoji", () => {
  assert.strictEqual(reminder.getEmojiByType("meeting"), "📅");
  assert.strictEqual(reminder.getEmojiByType("meal"), "🍱");
  assert.strictEqual(reminder.getEmojiByType("sleep"), "💤");
});

test("getEmojiByType：未知类型回退为默认闹钟", () => {
  assert.strictEqual(reminder.getEmojiByType("unknown_type"), "⏰");
  assert.strictEqual(reminder.getEmojiByType(undefined), "⏰");
});
