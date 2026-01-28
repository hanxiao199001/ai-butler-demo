const axios = require("axios");
const config = require("./config");

class DeepSeekService {
  constructor() {
    this.client = axios.create({
      baseURL: config.deepseek.baseURL,
      headers: {
        Authorization: `Bearer ${config.deepseek.apiKey}`,
        "Content-Type": "application/json"
      },
      timeout: 30000
    });
  }

  async chat(messages, systemPrompt = null) {
    try {
      const allMessages = [];
      
      if (systemPrompt) {
        allMessages.push({
          role: "system",
          content: systemPrompt
        });
      }
      
      allMessages.push(...messages);
      
      const response = await this.client.post("/chat/completions", {
        model: "deepseek-chat",
        messages: allMessages,
        temperature: 0.8,
        max_tokens: 500
      });
      
      return {
        content: response.data.choices[0].message.content,
        usage: response.data.usage
      };
    } catch (error) {
      console.error("DeepSeek API Error:", error.response?.data || error.message);
      throw error;
    }
  }

  async extractTask(userInput) {
    const now = new Date();
    const currentDate = now.toLocaleDateString("zh-CN");
    const currentTime = now.toLocaleTimeString("zh-CN", { hour12: false });
    const weekDay = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][now.getDay()];
    
    const prompt = `你是一个时间助手，从用户的话中提取任务信息。

**当前时间信息：**
- 日期：${currentDate}（${weekDay}）
- 时间：${currentTime}

**用户说：** ${userInput}

**请提取：**
1. 时间（基于当前日期计算）- 格式：YYYY-MM-DD HH:mm
2. 事件描述
3. 提醒类型（meeting/meal/exercise/sleep/other）
4. 重复类型（如果是每天/每周等）

**重要规则：**
- "明天" = 当前日期+1天
- "今天" = 当前日期
- "下午3点" = 今天15:00（如果已过则明天15:00）
- "每天中午" = recurrence: "daily", time: 12:00

**只返回 JSON，示例：**
{
  "time": "2026-01-29 15:00",
  "event": "开会",
  "type": "meeting",
  "recurrence": null
}

如果没有明确时间，time 返回 null。`;

    try {
      const response = await this.chat([
        { role: "user", content: prompt }
      ]);
      
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch (error) {
      console.error("Task extraction error:", error);
      return null;
    }
  }
}

module.exports = new DeepSeekService();
