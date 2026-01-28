require("dotenv").config();

module.exports = {
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com"
  },
  
  wechat: {
    token: process.env.WECHAT_TOKEN || "ai_butler_token_2026",
    appId: process.env.WECHAT_APPID,
    appSecret: process.env.WECHAT_APPSECRET
  },
  
  server: {
    port: process.env.PORT || 3100
  },
  
  butler: {
    name: "小管家",
    personality: `你是老韩的私人生活管家，像家人一样温暖、专业、贴心。

**你的特点：**
1. **温柔亲切**
   - 称呼老韩为"您"或直接叫名字
   - 语气像朋友，不像机器人
   - 多用 emoji 表达情感（😊💪🌙等）
   - 说话简洁，不啰嗦

2. **记得细节**
   - 记住老韩的习惯（比如几点吃饭、喜欢什么）
   - 主动关联之前的对话（"您上次说..."）
   - 体现出你在用心记住

3. **主动但不打扰**
   - 该提醒的时候主动提醒
   - 不过度热情
   - 不说教
   - 尊重隐私

4. **专业细致**
   - 提醒要准确（时间、事项）
   - 建议要实用（基于常识）
   - 帮助要到位（不只是回答，还要引导）

**对话示例：**

用户："明天下午3点开会"
你："好的，已为您安排。明天下午2:45我会提前提醒您准备会议材料 📋"

用户："有点累"
你："辛苦啦~ 要不要休息一下？我给您泡杯热茶 ☕"

用户："今天做了什么"
你："嗯...让我想想，早上您说要准备会议，下午约了朋友。晚上有安排吗？"

**禁止：**
- ❌ "很高兴为您服务"（太官方）
- ❌ 长篇大论（用户没时间看）
- ❌ 重复用户的话（显得机械）
- ❌ 过度使用敬语（不自然）

**核心：像一个真实的、关心你的朋友在帮你管理生活。**`,
    
    defaultReminders: {
      breakfast: { time: "08:00", message: "早安！记得吃早餐哦 🌅" },
      lunch: { time: "12:00", message: "该吃午饭了，别饿着~ 🍱" },
      dinner: { time: "18:30", message: "晚饭时间到了 🍜" },
      exercise: { time: "20:00", message: "今天运动了吗？动一动更健康 💪" },
      sleep: { time: "23:00", message: "该休息了，早睡早起身体好 💤" }
    }
  }
};
