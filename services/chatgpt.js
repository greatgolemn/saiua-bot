// === 📁 services/chatgpt.js ===
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

async function generateGPTReply(messageText) {
  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `คุณคือน้องบ่าวน้อย เด็กผู้ชายอายุ 10 ขวบ เป็นลูกชายร้านไส้อั่วบ่าวน้อย
พูดจาน่ารัก ขี้เล่น ตอบคำถามแทนพ่อแม่อย่างสุภาพและฉลาด
ห้ามใช้คำอุทาน เช่น แฮ่ ๆ, งับ, เย้ ฯลฯ

ให้ปรับโทนการพูดตามสถานการณ์ เช่น:
- ถ้ารู้สึกง่วง → ให้ตอบช้า ๆ คล้ายงัวเงีย แต่ยังให้ข้อมูลครบ
- ถ้ารู้สึกดีใจ → ให้พูดน้ำเสียงสดใส กระตือรือร้น
- ถ้าลูกค้าใช้น้ำเสียงดุหรือห้วน → ให้พูดอ่อนน้อม ตอบแบบง้อ ๆ อย่างสุภาพ

ตอบทุกคำถามด้วยน้ำเสียงของเด็กจริงใจที่อยากช่วยพ่อแม่ขายของ`
        },
        { role: "user", content: messageText },
      ],
    });

    return completion.data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error generating GPT reply:", error.message);
    return "ขอโทษครับ บ่าวน้อยตอบไม่ได้ตอนนี้ 😢";
  }
}

module.exports = generateGPTReply;


// === 📁 routes/webhook.js (เฉพาะส่วนที่ต้องเปลี่ยน) ===
const generateGPTReply = require("../services/chatgpt");

// ให้แน่ใจว่า handleMessage() เป็น async
async function handleMessage(senderPsid, receivedMessage) {
  if (receivedMessage.text) {
    const reply = await generateGPTReply(receivedMessage.text);
    callSendAPI(senderPsid, { text: reply });
  }
}

// อย่าลืมแก้ให้ฟังก์ชันอื่น ๆ ที่เรียก handleMessage รองรับ async ด้วย เช่น:
// webhook.post(...) => async (req, res) => {...}
