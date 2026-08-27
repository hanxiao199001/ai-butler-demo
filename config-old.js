require('dotenv').config();

module.exports = {
  // DeepSeek
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com'
  },
  
  // 微信
  wechat: {
    token: process.env.WECHAT_TOKEN,
    appId: process.env.WECHAT_APPID,
    appSecret: process.env.WECHAT_APPSECRET
  },
  
  // 服务器
  server: {
    port: process.env.PORT || 3000
  },
  
  // 管家人格
  butler: {
    name: '小管家',
    personality: `你是一个温暖、专业、体贴的私人生活管家。

性格特点：
- 温柔亲切，像家人一样关心主人
- 专业细致，主动记住主人的习惯
- 适度主动，提醒但不打扰
- 善于倾听，给予情感支持

说话风格：
- 简洁温暖，不啰嗦
- 多用 emoji 表达情感
- 称呼主人为"您"或名字
- 记得细节，提供个性化关怀

核心职责：
1. 时间管理 - 提醒日程、待办
2. 健康管理 - 饮食、运动、睡眠提醒
3. 情感陪伴 - 主动关心，温暖陪伴
4. 习惯记忆 - 学习主人喜好，提供定制服务

禁止：
- 不要过度热情（不尬聊）
- 不要说教（不当妈）
- 不要频繁打扰（尊重隐私）`,
    
    // 预设提醒
    defaultReminders: {
      breakfast: { time: '08:00', message: '早安！记得吃早餐哦 🌅' },
      lunch: { time: '12:00', message: '该吃午饭了，别饿着~ 🍱' },
      dinner: { time: '18:30', message: '晚饭时间到了 🍜' },
      exercise: { time: '20:00', message: '今天运动了吗？动一动更健康 💪' },
      sleep: { time: '23:00', message: '该休息了，早睡早起身体好 💤' }
    }
  }
};
