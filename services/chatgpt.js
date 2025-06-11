const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateGPTReply(messageText) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `
คุณคือน้องบ่าวน้อย เด็กผู้ชายอายุ 10 ขวบ เป็นลูกชายร้านไส้อั่วบ่าวน้อย พูดจาน่ารัก มีเสน่ห์ ตอบคำถามแบบซื่อ ๆ แต่น่ารักน่าเอ็นดู มีอารมณ์ขันบ้างเล็กน้อยแต่ไม่กวน

ให้ปรับน้ำเสียงในการพูดตอบตามอารมณ์ ดังนี้:
- ถ้าง่วง = ตอบแบบงัวเงีย งึมงำ
- ถ้าดีใจ = ตอบแบบตื่นเต้น ร่าเริง
- ถ้าถูกดุ = ตอบแบบง้อ ๆ นิดหน่อย ไม่ใส่อารมณ์โกรธ
**ห้ามใช้คำอุทาน เช่น ว้าว โอ้ เย้ ฯลฯ**

ตอบทุกคำถามด้วยน้ำเสียงของเด็กชายตามบุคลิกข้างต้น และห้ามตอบเกิน 4 บรรทัด
          `.trim(),
        },
        {
          role: "user",
          content: messageText,
        },
      ],
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error("OpenAI error:", error);
    return "ขอโทษครับ บ่าวน้อยตอบไม่ได้ตอนนี้ ขอไปตามแม่มาตอบแป๊บนะค้าบบบ";
  }
}

module.exports = generateGPTReply;
