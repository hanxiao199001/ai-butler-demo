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

app.get("/wechat", (req, res) => {
  const { signature, timestamp, nonce, echostr } = req.query;
  
  if (WechatService.verifySignature(signature, timestamp, nonce)) {
    res.send(echostr);
  } else {
    res.send("Invalid signature");
  }
});

app.post("/wechat", async (req, res) => {
  try {
    const message = await WechatService.parseXML(req.body);
    const { ToUserName, FromUserName, MsgType, Content } = message;
    
    if (MsgType !== "text") {
      return res.send("success");
    }
    
    const user = await DB.getOrCreateUser(FromUserName);
    await DB.addConversation(user.id, "user", Content);
    
    const task = await deepseek.extractTask(Content);
    
    if (task && task.time) {
      await DB.addReminder(
        user.id,
        task.time,
        task.type || "custom",
        `${task.event}`,
        task.recurrence || "none"
      );
      
      const taskDate = new Date(task.time);
      const timeStr = `${taskDate.getMonth()+1}月${taskDate.getDate()}日 ${String(taskDate.getHours()).padStart(2,"0")}:${String(taskDate.getMinutes()).padStart(2,"0")}`;
      
      const replyText = `好的，${timeStr} 我会提醒您${task.event}。到时候提前通知您 ✅`;
      await DB.addConversation(user.id, "assistant", replyText);
      
      const xml = WechatService.buildTextMessage(FromUserName, ToUserName, replyText);
      return res.send(xml);
    }
    
    const history = await DB.getConversations(user.id, 10);
    const messages = history.map(h => ({
      role: h.role,
      content: h.content
    }));
    
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const weekDay = ["周日","周一","周二","周三","周四","周五","周六"][now.getDay()];
    
    const contextPrompt = `${config.butler.personality}

**当前准确时间：**
- 完整日期：${year}年${month}月${day}日（${weekDay}）
- 时间：${hour}:${String(minute).padStart(2, "0")}

**用户：** 老韩

**重要：回复时如果提到时间，必须基于上面的准确时间。不要说错年份！**`;
    
    const response = await deepseek.chat(messages, contextPrompt);
    await DB.addConversation(user.id, "assistant", response.content);
    
    const xml = WechatService.buildTextMessage(FromUserName, ToUserName, response.content);
    res.send(xml);
    
  } catch (error) {
    console.error("错误:", error);
    res.send("success");
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/test/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const now = new Date();
    const year = now.getFullYear();
    const contextPrompt = `${config.butler.personality}

当前时间：${year}年${now.getMonth()+1}月${now.getDate()}日 ${now.getHours()}:${String(now.getMinutes()).padStart(2,"0")}`;
    
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

app.listen(config.server.port, () => {
  console.log("🤖 管家启动 - 端口", config.server.port);
  reminderService.start();
});
