const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'butler.db'));

// 初始化数据库
db.serialize(() => {
  // 用户表
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    openid TEXT UNIQUE NOT NULL,
    nickname TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // 用户习惯表
  db.run(`CREATE TABLE IF NOT EXISTS user_habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    habit_type TEXT,
    habit_time TEXT,
    habit_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);
  
  // 提醒任务表
  db.run(`CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    reminder_time TEXT,
    reminder_type TEXT,
    message TEXT,
    recurrence TEXT,
    enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);
  
  // 对话历史表
  db.run(`CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    role TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);
});

// 数据库操作封装
const DB = {
  // 获取或创建用户
  async getOrCreateUser(openid) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE openid = ?', [openid], (err, row) => {
        if (err) return reject(err);
        
        if (row) {
          // 更新活跃时间
          db.run('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?', [row.id]);
          resolve(row);
        } else {
          // 创建新用户
          db.run('INSERT INTO users (openid) VALUES (?)', [openid], function(err) {
            if (err) return reject(err);
            resolve({ id: this.lastID, openid });
          });
        }
      });
    });
  },
  
  // 添加对话记录
  async addConversation(userId, role, content) {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO conversations (user_id, role, content) VALUES (?, ?, ?)',
        [userId, role, content],
        function(err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
  },
  
  // 获取对话历史
  async getConversations(userId, limit = 10) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT role, content FROM conversations WHERE user_id = ? ORDER BY id DESC LIMIT ?',
        [userId, limit],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows.reverse()); // 反转顺序
        }
      );
    });
  },
  
  // 添加提醒
  async addReminder(userId, reminderTime, reminderType, message, recurrence = 'none') {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO reminders (user_id, reminder_time, reminder_type, message, recurrence) VALUES (?, ?, ?, ?, ?)',
        [userId, reminderTime, reminderType, message, recurrence],
        function(err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
  },
  
  // 获取用户提醒
  async getUserReminders(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM reminders WHERE user_id = ? AND enabled = 1',
        [userId],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
  },
  
  // 记录习惯
  async recordHabit(userId, habitType, habitTime, habitData = {}) {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO user_habits (user_id, habit_type, habit_time, habit_data) VALUES (?, ?, ?, ?)',
        [userId, habitType, habitTime, JSON.stringify(habitData)],
        function(err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
  }
};

module.exports = { db, DB };
