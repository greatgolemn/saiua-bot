
const { getSession, resetSession } = require('./session');
const { getRecipesFromSheet, appendOrderToSheet } = require('./sheets');
const { sendLineNotify } = require('./lineNotify');
const { formatOrderText } = require('../utils/orderFormatter');
const axios = require('axios');
const { OpenAI } = require('openai');

const PAGE_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function handleMessage(senderId, text) {
  const session = getSession(senderId);
  const step = session.step;
  const data = session.data;

  const send = async (msg) => {
    await axios.post(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_TOKEN}`, {
      recipient: { id: senderId },
      message: { text: msg },
    });
  };

  if (step === 0) {
    const recipes = await getRecipesFromSheet();
    if (recipes.length === 0) {
      await send('❌ ขอโทษครับ ตอนนี้ยังไม่มีสูตรให้เลือก');
      return;
    }
    session.availableRecipes = recipes;
    const list = recipes.map((r, i) => `${i + 1}. ${r}`).join('\n');
    await send('🍽️ เลือกสูตรไส้อั่ว:\n' + list);
    session.step++;
  } else if (step === 1) {
    const index = parseInt(text.trim()) - 1;
    const recipes = session.availableRecipes;
    if (isNaN(index) || index < 0 || index >= recipes.length) {
      await send('❌ กรุณาพิมพ์หมายเลขสูตรอีกครั้ง');
      return;
    }
    data.recipe = recipes[index];
    await send('📦 ประเภท (พร้อมทาน/ซีลสุญญากาศ)?');
    session.step++;
  } else if (step === 2) {
    data.type = text;
    await send('⚖️ ต้องการกี่กิโลกรัม?');
    session.step++;
  } else if (step === 3) {
    data.amount = text;
    await send('🧑 ขอทราบชื่อเล่นของคุณ');
    session.step++;
  } else if (step === 4) {
    data.nickname = text;
    await send('📱 เบอร์โทรติดต่อได้คือ?');
    session.step++;
  } else if (step === 5) {
    data.phone = text;
    await send('🚚 รับของแบบไหน? (นัดรับ/จัดส่ง)');
    session.step++;
  } else if (step === 6) {
    data.delivery = text;
    await send('📍 กรุณาส่งพิกัดหรือที่อยู่จัดส่ง');
    session.step++;
  } else if (step === 7) {
    data.location = text;
    await send('🕒 วันที่และเวลาที่ต้องการรับของ?');
    session.step++;
  } else if (step === 8) {
    data.datetime = text;
    await send('📝 ข้อความเพิ่มเติมถึงร้าน? (ถ้าไม่มี พิมพ์ว่า “ไม่มี”)');
    session.step++;
  } else if (step === 9) {
    data.notes = text;
    const summary = formatOrderText(data);
    await send('📋 สรุปออเดอร์ของคุณ:\n' + summary + '\n\nพิมพ์ "ยืนยัน" เพื่อส่งออเดอร์ หรือพิมพ์ "ยกเลิก" เพื่อยกเลิก');
    session.step++;
  } else if (step === 10) {
    if (text.toLowerCase() === 'ยืนยัน') {
      await appendOrderToSheet(data);
      const summary = formatOrderText(data);
      await send('✅ รับออเดอร์เรียบร้อยแล้ว ขอบคุณครับ!');
      await sendLineNotify('📥 มีออเดอร์ใหม่:\n' + summary);
      resetSession(senderId);
    } else {
      await send('❌ ยกเลิกออเดอร์แล้ว หากต้องการเริ่มใหม่ พิมพ์อะไรมาก็ได้');
      resetSession(senderId);
    }
  } else {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'คุณคือผู้ช่วยร้านไส้อั่วบ่าวน้อย ให้ข้อมูลสินค้า วิธีสั่งซื้อ และตอบลูกค้าด้วยน้ำเสียงเป็นกันเอง',
        },
        { role: 'user', content: text },
      ],
    });

    const reply = completion.choices[0].message.content;
    await send(reply);
  }
}

module.exports = { handleMessage };
