const cron = require("node-cron");
const { DB } = require("./database");
const wechatService = require("./wechat");

class ReminderService {
  constructor() {
    this.running = false;
  }
  
  start() {
    if (this.running) return;
    this.running = true;
    
    console.log("⏰ 提醒服务启动");
    
    cron.schedule("* * * * *", () => {
      this.checkAndSendReminders();
    });
  }
  
  async checkAndSendReminders() {
    try {
      const reminders = await DB.getDueReminders();
      
      if (reminders.length === 0) return;
      
      console.log(`📬 检测到 ${reminders.length} 条待发送提醒`);
      
      for (const reminder of reminders) {
        const { id, openid, preferred_name, message, reminder_type } = reminder;
        
        const greeting = preferred_name || "您好";
        const emoji = this.getEmojiByType(reminder_type);
        const fullMessage = `${emoji} ${greeting}，\n\n${message}\n\n— 您的管家`;
        
        const sent = await wechatService.sendCustomMessage(openid, fullMessage);
        
        if (sent) {
          await DB.markReminderSent(id);
          console.log(`✅ 提醒已发送: ${message}`);
        }
      }
    } catch (error) {
      console.error("提醒检查错误:", error);
    }
  }
  
  getEmojiByType(type) {
    const emojiMap = {
      meeting: "📅",
      meal: "🍱",
      exercise: "💪",
      sleep: "💤",
      custom: "⏰"
    };
    return emojiMap[type] || "⏰";
  }
}

module.exports = new ReminderService();
