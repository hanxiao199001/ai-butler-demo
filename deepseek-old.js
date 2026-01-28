const axios = require('axios');
const config = require('./config');

class DeepSeekService {
  constructor() {
    this.client = axios.create({
      baseURL: config.deepseek.baseURL,
      headers: {
        'Authorization': `Bearer ${config.deepseek.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }
  
  // 对话
  async chat(messages, systemPrompt = null) {
    try {
      const allMessages = [];
      
      // 系统 Prompt
      if (systemPrompt) {
        allMessages.push({
          role: 'system',
          content: systemPrompt
        });
      }
      
      // 添加对话历史
      allMessages.push(...messages);
      
      const response = await this.client.post('/chat/completions', {
        model: 'deepseek-chat',
        messages: allMessages,
        temperature: 0.8,
        max_tokens: 500
      });
      
      return {
        content: response.data.choices[0].message.content,
        usage: response.data.usage
      };
    } catch (error) {
      console.error('DeepSeek API Error:', error.response?.data || error.message);
      throw error;
    }
  }
  
  // 任务提取（从自然语言中提取时间、事件）
  async extractTask(userInput) {
    const prompt = `从用户的话中提取任务信息，以 JSON 格式返回。

用户说：${userInput}

请提取：
1. 时间（如果有）- 格式：YYYY-MM-DD HH:mm
2. 事件描述
3. 提醒类型（meeting/meal/exercise/other）

如果没有明确时间，返回 null。

示例输入："明天下午3点开会"
示例输出：
{
  "time": "2026-01-29 15:00",
  "event": "开会",
  "type": "meeting"
}

示例输入："提醒我吃午饭"
示例输出：
{
  "time": null,
  "event": "吃午饭",
  "type": "meal",
  "recurrence": "daily"
}

只返回 JSON，不要其他内容。`;

    try {
      const response = await this.chat([
        { role: 'user', content: prompt }
      ]);
      
      // 尝试解析 JSON
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch (error) {
      console.error('Task extraction error:', error);
      return null;
    }
  }
}

module.exports = new DeepSeekService();
