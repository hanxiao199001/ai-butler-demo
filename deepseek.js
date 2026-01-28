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
        temperature: 0.7,
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
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const weekDay = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][now.getDay()];
    
    // 计算明天
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowYear = tomorrow.getFullYear();
    const tomorrowMonth = tomorrow.getMonth() + 1;
    const tomorrowDay = tomorrow.getDate();
    
    const prompt = `你是时间助手。从用户的话中提取任务时间。

**当前准确时间：**
- 完整日期：${year}年${month}月${day}日 ${hour}:${String(minute).padStart(2, "0")}
- 星期：${weekDay}

**明天日期：**
- ${tomorrowYear}年${tomorrowMonth}月${tomorrowDay}日

**用户说：** "${userInput}"

**提取规则：**
1. "今天下午3点" → ${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} 15:00
2. "明天下午3点" → ${tomorrowYear}-${String(tomorrowMonth).padStart(2, "0")}-${String(tomorrowDay).padStart(2, "0")} 15:00
3. "下午3点"（未说今天/明天）→ 如果现在已过15:00，则明天；否则今天
4. "每天中午12点" → recurrence: "daily", time 用今天日期+12:00

**只返回 JSON：**
{
  "time": "YYYY-MM-DD HH:mm",
  "event": "事件描述",
  "type": "meeting/meal/exercise/sleep/other",
  "recurrence": null 或 "daily"
}

如果没明确时间，time 返回 null。`;

    try {
      const response = await this.chat([
        { role: "user", content: prompt }
      ]);
      
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        console.log("任务提取结果:", result);
        return result;
      }
      return null;
    } catch (error) {
      console.error("Task extraction error:", error);
      return null;
    }
  }
}

module.exports = new DeepSeekService();
