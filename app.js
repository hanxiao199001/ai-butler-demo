const config = require("./config");

try {
  config.assertRequiredSecrets();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const express = require("express");
const bodyParser = require("body-parser");
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
    
    // 首次对话引导
    if (!user.first_chat_completed) {
      return await handleFirstChat(user, Content, FromUserName, ToUserName, res);
    }
    
    await DB.addConversation(user.id, "user", Content);
    
    // 习惯学习（检测吃饭、运动等活动）
    await learnUserHabits(user.id, Content);
    
    // 检查任务
    const task = await deepseek.extractTask(Content);
    
    if (task && task.time) {
      await DB.addReminder(
        user.id,
        task.time,
        task.type || "custom",
        task.event,
        task.recurrence || "none"
      );
      
      const taskDate = new Date(task.time);
      const timeStr = `${taskDate.getMonth()+1}月${taskDate.getDate()}日 ${String(taskDate.getHours()).padStart(2,"0")}:${String(taskDate.getMinutes()).padStart(2,"0")}`;
      
      const replyText = `好的${user.preferred_name ? " " + user.preferred_name : ""}，${timeStr} 我会提醒您${task.event}。到时候提前通知您 ✅`;
      await DB.addConversation(user.id, "assistant", replyText);
      
      const xml = WechatService.buildTextMessage(FromUserName, ToUserName, replyText);
      return res.send(xml);
    }
    
    // 普通对话
    const history = await DB.getConversations(user.id, 10);
    const messages = history.map(h => ({ role: h.role, content: h.content }));
    
    const contextPrompt = await buildContextPrompt(user);
    const response = await deepseek.chat(messages, contextPrompt);
    
    await DB.addConversation(user.id, "assistant", response.content);
    
    const xml = WechatService.buildTextMessage(FromUserName, ToUserName, response.content);
    res.send(xml);
    
  } catch (error) {
    console.error("错误:", error);
    res.send("success");
  }
});

async function handleFirstChat(user, content, fromUser, toUser, res) {
  const step = await getFirstChatStep(user.id);
  
  if (step === 0) {
    const welcomeText = `你好！我是你的私人生活管家 🤖

很高兴认识你！为了更好地为你服务，我想先了解一下：

✨ 我应该怎么称呼你呢？
（比如：小王、老李、阿美...）`;
    
    await DB.addConversation(user.id, "assistant", welcomeText);
    await DB.recordActivity(user.id, "first_chat_step", { step: 1 });
    
    const xml = WechatService.buildTextMessage(fromUser, toUser, welcomeText);
    return res.send(xml);
  }
  
  if (step === 1) {
    const preferredName = content.trim();
    await DB.updateUserInfo(user.id, preferredName, preferredName);
    
    const confirmText = `好的，${preferredName}！认识你很开心 😊

我会：
✅ 帮你记住重要的事
✅ 按时提醒你吃饭、运动、休息
✅ 默默陪伴，随时倾听

现在开始，我就是你的私人管家了！

有什么需要，随时告诉我~`;
    
    await DB.addConversation(user.id, "assistant", confirmText);
    
    const xml = WechatService.buildTextMessage(fromUser, toUser, confirmText);
    return res.send(xml);
  }
}

async function getFirstChatStep(userId) {
  return new Promise((resolve) => {
    const { db } = require("./database");
    db.get(
      "SELECT activity_data FROM user_activities WHERE user_id = ? AND activity_type = \"first_chat_step\" ORDER BY id DESC LIMIT 1",
      [userId],
      (err, row) => {
        if (err || !row) return resolve(0);
        const data = JSON.parse(row.activity_data);
        resolve(data.step || 0);
      }
    );
  });
}

async function learnUserHabits(userId, content) {
  const now = new Date();
  const hour = now.getHours();
  const timeStr = `${String(hour).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  
  const lowerContent = content.toLowerCase();
  
  // 检测吃饭
  if (lowerContent.includes("吃饭") || lowerContent.includes("午饭") || lowerContent.includes("晚饭") || lowerContent.includes("早餐")) {
    let mealType = "meal";
    if (hour >= 6 && hour < 10) mealType = "breakfast";
    else if (hour >= 11 && hour < 14) mealType = "lunch";
    else if (hour >= 17 && hour < 20) mealType = "dinner";
    
    await DB.updateHabit(userId, mealType, timeStr);
    console.log(`📊 习惯学习: ${mealType} at ${timeStr}`);
  }
  
  // 检测运动
  if (lowerContent.includes("运动") || lowerContent.includes("健身") || lowerContent.includes("跑步")) {
    await DB.updateHabit(userId, "exercise", timeStr);
    console.log(`📊 习惯学习: exercise at ${timeStr}`);
  }
  
  // 检测睡觉
  if (lowerContent.includes("睡觉") || lowerContent.includes("休息") || lowerContent.includes("晚安")) {
    await DB.updateHabit(userId, "sleep", timeStr);
    console.log(`📊 习惯学习: sleep at ${timeStr}`);
  }
}

async function buildContextPrompt(user) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const weekDay = ["周日","周一","周二","周三","周四","周五","周六"][now.getDay()];
  
  const habits = await DB.getUserHabits(user.id);
  let habitInfo = "暂无";
  if (habits.length > 0) {
    habitInfo = habits.map(h => `${h.habit_type}: 通常${h.habit_time}`).join("; ");
  }
  
  const name = user.preferred_name || "您";
  
  return `${config.butler.personality}

**当前准确时间：**
${year}年${month}月${day}日（${weekDay}）${hour}:${String(minute).padStart(2, "0")}

**用户信息：**
- 称呼：${name}
- 习惯：${habitInfo}

**重要提示：**
- 直接称呼用户为"${name}"
- 基于习惯数据主动关怀
- 回复要温暖、自然、像朋友`;
}

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/test/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const contextPrompt = await buildContextPrompt({ id: 1, preferred_name: "测试用户" });
    const response = await deepseek.chat([{ role: "user", content: message }], contextPrompt);
    res.json({ reply: response.content, usage: response.usage });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(config.server.port, () => {
  console.log("🤖 AI 私人管家启动成功！");
  console.log(`📍 端口: ${config.server.port}`);
  console.log(`📱 微信接入已启用`);
  console.log(`⏰ 定时提醒已启动`);
  console.log(`🧠 习惯学习已启动`);
  console.log("\n✨ 管家已就绪，随时为您服务！\n");
  
  reminderService.start();
});
