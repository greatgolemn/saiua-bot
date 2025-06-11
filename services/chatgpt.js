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
          content: "คุณคือร้านขายไส้อั่วบ่าวน้อย พูดจาเป็นกันเอง ให้ข้อมูลสั้น ชัดเจน และจริงใจ",
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
