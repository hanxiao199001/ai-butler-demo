const express = require('express');
const bodyParser = require('body-parser');
const config = require('./config');
const { DB } = require('./database');
const deepseek = require('./deepseek');
const WechatService = require('./wechat');
const reminderService = require('./reminder');

const app = express();

// 中间件
app.use(bodyParser.text({ type: 'text/xml' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 微信服务器验证
app.get('/wechat', (req, res) => {
  const { signature, timestamp, nonce, echostr } = req.query;
  
  if (WechatService.verifySignature(signature, timestamp, nonce)) {
    console.log('✅ 微信验证成功');
    res.send(echostr);
  } else {
    console.log('❌ 微信验证失败');
    res.send('Invalid signature');
  }
});

// 接收微信消息
app.post('/wechat', async (req, res) => {
  try {
    const message = await WechatService.parseXML(req.body);
    console.log('收到消息:', message);
    
    const { ToUserName, FromUserName, MsgType, Content } = message;
    
    // 只处理文本消息
    if (MsgType !== 'text') {
      return res.send('success');
    }
    
    // 获取或创建用户
    const user = await DB.getOrCreateUser(FromUserName);
    
    // 保存用户消息
    await DB.addConversation(user.id, 'user', Content);
    
    // 检查是否是任务设置
    const task = await deepseek.extractTask(Content);
    
    if (task && task.time) {
      // 提取到任务，保存提醒
      await DB.addReminder(
        user.id,
        task.time,
        task.type || 'custom',
        `提醒：${task.event}`,
        task.recurrence || 'none'
      );
      
      const replyText = `好的，我会在 ${task.time} 提醒您${task.event} ✅`;
      await DB.addConversation(user.id, 'assistant', replyText);
      
      const xml = WechatService.buildTextMessage(FromUserName, ToUserName, replyText);
      return res.send(xml);
    }
    
    // 普通对话
    const history = await DB.getConversations(user.id, 8);
    const messages = history.map(h => ({
      role: h.role,
      content: h.content
    }));
    
    const response = await deepseek.chat(messages, config.butler.personality);
    
    // 保存 AI 回复
    await DB.addConversation(user.id, 'assistant', response.content);
    
    const xml = WechatService.buildTextMessage(FromUserName, ToUserName, response.content);
    res.send(xml);
    
  } catch (error) {
    console.error('处理消息错误:', error);
    res.send('success');
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'AI Butler Demo' });
});

// 测试接口（开发用）
app.post('/test/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const response = await deepseek.chat([
      { role: 'user', content: message }
    ], config.butler.personality);
    
    res.json({
      reply: response.content,
      usage: response.usage
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 启动服务
const PORT = config.server.port;

app.listen(PORT, () => {
  console.log('🤖 AI 私人管家 Demo 启动成功！');
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`📱 微信接入: http://your-domain.com/wechat`);
  console.log(`💚 健康检查: http://localhost:${PORT}/health`);
  
  // 启动提醒服务
  reminderService.start();
  
  console.log('\n✨ 管家已就绪，随时为您服务！');
});
