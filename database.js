const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// 测试可设置 BUTLER_DB_PATH=:memory:，避免写入仓库根目录的 butler.db
const dbPath = process.env.BUTLER_DB_PATH || path.join(__dirname, "butler.db");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // 用户表（增加个性化字段）
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    openid TEXT UNIQUE NOT NULL,
    nickname TEXT,
    preferred_name TEXT,
    first_chat_completed INTEGER DEFAULT 0,
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
    frequency INTEGER DEFAULT 1,
    last_occurred DATETIME,
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
    last_sent DATETIME,
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
  
  // 行为记录表（用于习惯学习）
  db.run(`CREATE TABLE IF NOT EXISTS user_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    activity_type TEXT,
    activity_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    activity_data TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);
});

const DB = {
  async getOrCreateUser(openid) {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM users WHERE openid = ?", [openid], (err, row) => {
        if (err) return reject(err);
        
        if (row) {
          db.run("UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?", [row.id]);
          resolve(row);
        } else {
          db.run("INSERT INTO users (openid) VALUES (?)", [openid], function(err) {
            if (err) return reject(err);
            resolve({ 
              id: this.lastID, 
              openid, 
              first_chat_completed: 0,
              preferred_name: null
            });
          });
        }
      });
    });
  },
  
  async updateUserInfo(userId, nickname, preferredName) {
    return new Promise((resolve, reject) => {
      db.run(
        "UPDATE users SET nickname = ?, preferred_name = ?, first_chat_completed = 1 WHERE id = ?",
        [nickname, preferredName, userId],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  },
  
  async addConversation(userId, role, content) {
    return new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO conversations (user_id, role, content) VALUES (?, ?, ?)",
        [userId, role, content],
        function(err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
  },
  
  async getConversations(userId, limit = 10) {
    return new Promise((resolve, reject) => {
      db.all(
        "SELECT role, content FROM conversations WHERE user_id = ? ORDER BY id DESC LIMIT ?",
        [userId, limit],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows.reverse());
        }
      );
    });
  },
  
  async addReminder(userId, reminderTime, reminderType, message, recurrence = "none") {
    return new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO reminders (user_id, reminder_time, reminder_type, message, recurrence) VALUES (?, ?, ?, ?, ?)",
        [userId, reminderTime, reminderType, message, recurrence],
        function(err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
  },
  
  async getUserReminders(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        "SELECT * FROM reminders WHERE user_id = ? AND enabled = 1",
        [userId],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
  },
  
  async getDueReminders() {
    return new Promise((resolve, reject) => {
      const now = new Date();
      const currentTime = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      
      db.all(
        `SELECT r.*, u.openid, u.preferred_name 
         FROM reminders r 
         JOIN users u ON r.user_id = u.id 
         WHERE r.enabled = 1 
         AND r.reminder_time <= ? 
         AND (r.last_sent IS NULL OR r.last_sent < ?)`,
        [currentTime, currentTime],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
  },
  
  async markReminderSent(reminderId) {
    return new Promise((resolve, reject) => {
      db.run(
        "UPDATE reminders SET last_sent = CURRENT_TIMESTAMP WHERE id = ?",
        [reminderId],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  },
  
  async recordActivity(userId, activityType, activityData = {}) {
    return new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO user_activities (user_id, activity_type, activity_data) VALUES (?, ?, ?)",
        [userId, activityType, JSON.stringify(activityData)],
        function(err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
  },
  
  async getUserHabits(userId, habitType = null) {
    return new Promise((resolve, reject) => {
      let query = "SELECT * FROM user_habits WHERE user_id = ?";
      let params = [userId];
      
      if (habitType) {
        query += " AND habit_type = ?";
        params.push(habitType);
      }
      
      query += " ORDER BY frequency DESC";
      
      db.all(query, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  },
  
  async updateHabit(userId, habitType, habitTime) {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM user_habits WHERE user_id = ? AND habit_type = ?",
        [userId, habitType],
        (err, row) => {
          if (err) return reject(err);
          
          if (row) {
            db.run(
              "UPDATE user_habits SET habit_time = ?, frequency = frequency + 1, last_occurred = CURRENT_TIMESTAMP WHERE id = ?",
              [habitTime, row.id]
            );
          } else {
            db.run(
              "INSERT INTO user_habits (user_id, habit_type, habit_time, last_occurred) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
              [userId, habitType, habitTime]
            );
          }
          resolve();
        }
      );
    });
  }
};

module.exports = { db, DB };
