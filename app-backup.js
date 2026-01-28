const express = require("express");
const bodyParser = require("body-parser");
const config = require("./config");
const { DB } = require("./database");
const deepseek = require("./deepseek");
const WechatService = require("./wechat");
const reminderService = require("./reminder");

const app = express();

app.use(bodyParser.text({ type: "text/xml" }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 微信验证
app.get("/wechat", (req, res) => {
  const { signature, timestamp, nonce, echostr } = req.query;
  
  if (WechatService.verifySignature(signature, timestamp, nonce)) {
    console.log("✅ 微信验证成功");
    res.send(echostr);
  } else {
    console.log("❌ 微信验证失败");
    res.send("Invalid signature");
  }
});

// 接收消息
app.post("/wechat", async (req, res) => {
  try {
    const message = await WechatService.parseXML(req.body);
    console.log("收到消息:", message);
    
    const { ToUserName, FromUserName, MsgType, Content } = message;
    
    if (MsgType !== "text") {
      return res.send("success");
    }
    
    const user = await DB.getOrCreateUser(FromUserName);
    await DB.addConversation(user.id, "user", Content);
    
    // 检查任务
    const task = await deepseek.extractTask(Content);
    
    if (task && task.time) {
      await DB.addReminder(
        user.id,
        task.time,
        task.type || "custom",
        `提醒：${task.event}`,
        task.recurrence || "none"
      );
      
      const now = new Date();
      const taskDate = new Date(task.time);
      const isToday = now.toDateString() === taskDate.toDateString();
      const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === taskDate.toDateString();
      
      let timeDesc = task.time;
      if (isToday) timeDesc = "今天 " + task.time.split(" ")[1];
      if (isTomorrow) timeDesc = "明天 " + task.time.split(" ")[1];
      
      const replyText = `好的，${timeDesc} 我会提醒您${task.event}。到时候提前15分钟通知您 ✅`;
      await DB.addConversation(user.id, "assistant", replyText);
      
      const xml = WechatService.buildTextMessage(FromUserName, ToUserName, replyText);
      return res.send(xml);
    }
    
    // 普通对话 - 加入上下文和用户信息
    const history = await DB.getConversations(user.id, 10);
    const messages = history.map(h => ({
      role: h.role,
      content: h.content
    }));
    
    // 构建增强的系统 Prompt
    const now = new Date();
    const contextPrompt = `${config.butler.personality}

**当前时间：** ${now.toLocaleString("zh-CN")}（${["周日","周一","周二","周三","周四","周五","周六"][now.getDay()]}）
**用户：** 老韩
**最近提醒：** ${await getUserRecentReminders(user.id)}

记住：你要像一个真实的、温暖的朋友，而不是冷冰冰的机器人。`;
    
    const response = await deepseek.chat(messages, contextPrompt);
    
    await DB.addConversation(user.id, "assistant", response.content);
    
    const xml = WechatService.buildTextMessage(FromUserName, ToUserName, response.content);
    res.send(xml);
    
  } catch (error) {
    console.error("处理消息错误:", error);
    res.send("success");
  }
});

async function getUserRecentReminders(userId) {
  try {
    const reminders = await DB.getUserReminders(userId);
    if (reminders.length === 0) return "暂无";
    return reminders.slice(0, 3).map(r => 
      `${r.reminder_time} - ${r.message}`
    ).join("; ");
  } catch {
    return "暂无";
  }
}

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "AI Butler Demo" });
});

app.post("/test/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const now = new Date();
    const contextPrompt = `${config.butler.personality}

**当前时间：** ${now.toLocaleString("zh-CN")}`;
    
    const response = await deepseek.chat([
      { role: "user", content: message }
    ], contextPrompt);
    
    res.json({
      reply: response.content,
      usage: response.usage
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = config.server.port;

app.listen(PORT, () => {
  console.log("🤖 AI 私人管家 Demo 启动成功！");
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`📱 微信接入: http://your-domain.com/wechat`);
  console.log(`💚 健康检查: http://localhost:${PORT}/health`);
  
  reminderService.start();
  
  console.log("\n✨ 管家已就绪，随时为您服务！");
});
