/**
 * 测试脚本 - 验证核心功能
 */

const deepseek = require('./deepseek');

async function testChat() {
  console.log('🧪 测试对话功能...\n');
  
  try {
    const response = await deepseek.chat([
      { role: 'user', content: '你好，介绍一下你自己' }
    ], `你是一个温暖的私人管家。简短介绍自己。`);
    
    console.log('✅ 对话成功！');
    console.log('回复:', response.content);
    console.log('Token 消耗:', response.usage);
  } catch (error) {
    console.error('❌ 对话失败:', error.message);
  }
}

async function testTaskExtraction() {
  console.log('\n🧪 测试任务提取...\n');
  
  const testCases = [
    '明天下午3点开会',
    '提醒我每天中午12点吃饭',
    '今天晚上8点健身',
    '随便聊聊天'
  ];
  
  for (const input of testCases) {
    try {
      const task = await deepseek.extractTask(input);
      console.log(`输入: "${input}"`);
      console.log('提取结果:', task);
      console.log('---');
    } catch (error) {
      console.error('提取失败:', error.message);
    }
  }
}

async function main() {
  console.log('🤖 AI 私人管家 - 功能测试\n');
  console.log('=' .repeat(50));
  
  // 检查环境变量
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error('❌ 错误: 未设置 DEEPSEEK_API_KEY');
    console.log('请先配置 .env 文件');
    process.exit(1);
  }
  
  await testChat();
  await testTaskExtraction();
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ 测试完成！');
}

main().catch(console.error);
