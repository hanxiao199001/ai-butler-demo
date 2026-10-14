// 提醒服务单元测试。必须在加载 database 之前指定内存库，避免碰仓库里的 butler.db
process.env.WECHAT_TOKEN = process.env.WECHAT_TOKEN || "unit_test_token";
process.env.BUTLER_DB_PATH = ":memory:";

const { test, after } = require("node:test");
const assert = require("node:assert");
const WechatService = require("../wechat");
const reminder = require("../reminder");
const { db, DB } = require("../database");

function getReminder(id) {
  return new Promise((resolve, reject) => {
    db.get("SELECT last_sent, message FROM reminders WHERE id = ?", [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

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

test("到期提醒通过 WechatService 实例发送，成功才标记已发送", async () => {
  const user = await DB.getOrCreateUser("openid_reminder_ok");
  await DB.updateUserInfo(user.id, "小测", "小测");
  const sentId = await DB.addReminder(user.id, "2000-01-01 00:00", "meeting", "开会", "none");

  const failedUser = await DB.getOrCreateUser("openid_reminder_fail");
  await DB.updateUserInfo(failedUser.id, "未送达", "未送达");
  const failedId = await DB.addReminder(failedUser.id, "2000-01-01 00:05", "meal", "吃饭", "none");

  const calls = [];
  const original = WechatService.prototype.sendCustomMessage;
  WechatService.prototype.sendCustomMessage = async function (openid, content) {
    calls.push({
      openid,
      content,
      isInstance: this instanceof WechatService
    });
    return openid === "openid_reminder_ok";
  };

  try {
    await reminder.checkAndSendReminders();
  } finally {
    WechatService.prototype.sendCustomMessage = original;
  }

  const okCall = calls.find((call) => call.openid === "openid_reminder_ok");
  const failedCall = calls.find((call) => call.openid === "openid_reminder_fail");
  assert.ok(okCall, "应调用实例上的 sendCustomMessage");
  assert.strictEqual(okCall.isInstance, true);
  assert.match(okCall.content, /小测/);
  assert.match(okCall.content, /开会/);
  assert.ok(failedCall, "发送失败的提醒也应尝试投递");

  const sentRow = await getReminder(sentId);
  const failedRow = await getReminder(failedId);
  assert.ok(sentRow.last_sent, "发送成功后应写入 last_sent");
  assert.strictEqual(failedRow.last_sent, null);
});
