const crypto = require("crypto");
const xml2js = require("xml2js");
const axios = require("axios");
const config = require("./config");

class WechatService {
  constructor() {
    this.accessToken = null;
    this.tokenExpireTime = 0;
  }
  
  static verifySignature(signature, timestamp, nonce) {
    const token = config.wechat.token;
    const arr = [token, timestamp, nonce].sort();
    const str = arr.join("");
    const hash = crypto.createHash("sha1").update(str).digest("hex");
    return hash === signature;
  }
  
  static async parseXML(xml) {
    return new Promise((resolve, reject) => {
      xml2js.parseString(xml, { explicitArray: false }, (err, result) => {
        if (err) return reject(err);
        resolve(result.xml);
      });
    });
  }
  
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
  
  async getAccessToken() {
    const now = Date.now();
    
    if (this.accessToken && now < this.tokenExpireTime) {
      return this.accessToken;
    }
    
    try {
      const response = await axios.get("https://api.weixin.qq.com/cgi-bin/token", {
        params: {
          grant_type: "client_credential",
          appid: config.wechat.appId,
          secret: config.wechat.appSecret
        }
      });
      
      if (response.data.access_token) {
        this.accessToken = response.data.access_token;
        this.tokenExpireTime = now + (response.data.expires_in - 300) * 1000;
        console.log("✅ 获取 access_token 成功");
        return this.accessToken;
      } else {
        console.error("❌ 获取 access_token 失败:", response.data);
        return null;
      }
    } catch (error) {
      console.error("❌ 获取 access_token 错误:", error.message);
      return null;
    }
  }
  
  async sendCustomMessage(openid, content) {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        console.error("无法发送消息：access_token 获取失败");
        return false;
      }
      
      const response = await axios.post(
        `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${accessToken}`,
        {
          touser: openid,
          msgtype: "text",
          text: {
            content: content
          }
        }
      );
      
      if (response.data.errcode === 0) {
        console.log(`✅ 消息发送成功: ${openid}`);
        return true;
      } else {
        console.error(`❌ 消息发送失败:`, response.data);
        return false;
      }
    } catch (error) {
      console.error("❌ 发送消息错误:", error.message);
      return false;
    }
  }
}

module.exports = WechatService;
