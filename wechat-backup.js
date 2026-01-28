const crypto = require('crypto');
const xml2js = require('xml2js');
const config = require('./config');

class WechatService {
  // 验证微信服务器
  static verifySignature(signature, timestamp, nonce) {
    const token = config.wechat.token;
    const arr = [token, timestamp, nonce].sort();
    const str = arr.join('');
    const hash = crypto.createHash('sha1').update(str).digest('hex');
    return hash === signature;
  }
  
  // 解析 XML 消息
  static async parseXML(xml) {
    return new Promise((resolve, reject) => {
      xml2js.parseString(xml, { explicitArray: false }, (err, result) => {
        if (err) return reject(err);
        resolve(result.xml);
      });
    });
  }
  
  // 构建回复消息
  static buildTextMessage(toUser, fromUser, content) {
    const xml = `<xml>
  <ToUserName><![CDATA[${toUser}]]></ToUserName>
  <FromUserName><![CDATA[${fromUser}]]></FromUserName>
  <CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[${content}]]></Content>
</xml>`;
    return xml;
  }
  
  // 获取 Access Token（用于客服消息）
  static async getAccessToken() {
    // TODO: 实现 access_token 获取和缓存
    // 这里先返回空，实际部署时需要实现
    return null;
  }
  
  // 发送客服消息（主动推送）
  static async sendCustomMessage(openid, content) {
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      console.log('暂无 access_token，使用被动回复模式');
      return;
    }
    
    // TODO: 实现客服消息发送
    // POST https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=TOKEN
  }
}

module.exports = WechatService;
