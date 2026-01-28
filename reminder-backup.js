const cron = require('node-cron');
const { DB } = require('./database');
const WechatService = require('./wechat');

class ReminderService {
  constructor() {
    this.jobs = new Map();
  }
  
  // 启动提醒服务
  start() {
    console.log('⏰ 提醒服务启动');
    
    // 每分钟检查一次需要提醒的任务
    cron.schedule('* * * * *', () => {
      this.checkReminders();
    });
  }
  
  // 检查并发送提醒
  async checkReminders() {
    try {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      // 这里简化处理，实际应该从数据库查询所有需要提醒的用户
      console.log(`[${currentTime}] 检查提醒...`);
      
      // TODO: 实现提醒逻辑
      // 1. 查询数据库中所有到时间的提醒
      // 2. 发送微信消息
      // 3. 更新提醒状态
      
    } catch (error) {
      console.error('Reminder check error:', error);
    }
  }
  
  // 添加用户提醒
  async addUserReminder(userId, reminderTime, message, recurrence = 'none') {
    await DB.addReminder(userId, reminderTime, 'custom', message, recurrence);
    console.log(`✅ 添加提醒：用户${userId} - ${reminderTime} - ${message}`);
  }
}

module.exports = new ReminderService();
