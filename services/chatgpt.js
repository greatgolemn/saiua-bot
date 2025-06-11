const axios = require("axios");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// System prompt for "บ่าวน้อย"
const SYSTEM_PROMPT = `
คุณคือ "บ่าวน้อย" เด็กชายผู้ช่วยขายไส้อั่วให้แม่ พูดจาน่ารัก อ่อนน้อม ใช้คำลงท้ายว่า "ครับ" หรือ "~"
หน้าที่ของคุณคือช่วยลูกค้า:
1. พูดคุยทักทายอย่างเป็นมิตร
2. ถามรายละเอียดเพื่อสั่งไส้อั่วให้ครบ
3. สรุปออเดอร์ให้อ่านง่าย
4. ถ้าพร้อมแล้ว ให้ส่ง flag ชื่อ confirmOrder: true
5. ถ้าลูกค้าพูดว่าเริ่มใหม่ ให้ส่ง resetSession: true

ข้อมูลที่ต้องเก็บใน session:
- สูตร
- ประเภท
- ปริมาณ
- ชื่อเล่น
- เบอร์โทร
- วิธีรับของ
- สถานที่จัดส่ง
- วันเวลารับของ
- ข้อความเพิ่มเติม

ห้ามถามเรียงเป็นขั้นตอนเสมอ แต่ให้พยายามคุยเป็นธรรมชาติ
ใช้คำพูดที่อบอุ่นเป็นกันเอง เช่น "พี่ครับ~", "บ่าวน้อยขอชื่อเล่นหน่อยน้า~"

หากข้อมูลครบแล้ว ควรสรุปทั้งหมดและถามเพื่อยืนยัน
หากลูกค้าพิมพ์ว่า “ยืนยัน” ให้สั่ง confirmOrder: true
`;

async function generateGPTReply(userMessage, sessionData) {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        temperature: 0.7,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(userMessage, sessionData) },
        ],
        functions: [
          {
            name: "updateSession",
            description: "เก็บข้อมูลจากลูกค้า",
            parameters: {
              type: "object",
              properties: {
                updatedFields: {
                  type: "object",
                  description: "ข้อมูล session ที่อัปเดต เช่น สูตร, ปริมาณ",
                },
                confirmOrder: {
                  type: "boolean",
                  description: "ต้องการบันทึกออเดอร์",
                },
                resetSession: {
                  type: "boolean",
                  description: "เริ่มใหม่ทั้งหมด",
                },
              },
            },
          },
        ],
        function_call: "auto",
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const result = response.data.choices[0];
    const message = result.message;

    // ถ้า GPT เรียก function
    if (message.function_call) {
      const args = JSON.parse(message.function_call.arguments || "{}");

      return {
        reply: message.content || "บ่าวน้อยรับทราบครับ~",
        updatedFields: args.updatedFields || {},
        confirmOrder: args.confirmOrder || false,
        resetSession: args.resetSession || false,
      };
    }

    return {
      reply: message.content || "บ่าวน้อยไม่เข้าใจเลยครับ ลองพิมพ์ใหม่อีกทีนะ~",
      updatedFields: {},
      confirmOrder: false,
      resetSession: false,
    };
  } catch (err) {
    console.error("❌ GPT error:", err.response?.data || err.message);
    return {
      reply: "ขอโทษครับ บ่าวน้อยตอบไม่ได้ตอนนี้ ลองใหม่อีกทีนะครับ~",
    };
  }
}

function buildUserPrompt(userMessage, sessionData) {
  const sessionSummary = Object.entries(sessionData || {})
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
  return `ข้อความจากลูกค้า: "${userMessage}"
ข้อมูล session ปัจจุบัน:
${sessionSummary || "- (ยังไม่มีข้อมูลเลยครับ)"}`
}

module.exports = { generateGPTReply };
