const express = require("express");
const router = express.Router();
const axios = require("axios");
const generateGPTReply = require("../services/chatgpt");
const { getSession, clearSession, updateSession } = require("../services/session");
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// webhook verification
router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// webhook message handler
router.post("/", async (req, res) => {
  const body = req.body;

  if (body.object === "page") {
    for (const entry of body.entry) {
      const webhookEvent = entry.messaging[0];
      const senderPsid = webhookEvent.sender.id;

      if (webhookEvent.message) {
        await handleMessage(senderPsid, webhookEvent.message);
      }
    }

    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

// handle message
async function handleMessage(senderPsid, receivedMessage) {
  const session = getSession(senderPsid) || { step: 0, data: {} }; // ✅ ป้องกัน undefined
  const text = receivedMessage.text?.trim();

  if (!text) return;

  if (session.step === 0) {
    // เริ่มต้นการสนทนาใหม่
    updateSession(senderPsid, { step: 1 });
    return callSendAPI(senderPsid, {
      text: "สวัสดีครับบ่าวน้อยไส้อั่วยินดีต้อนรับ เลือกสูตรไส้อั่วที่ต้องการได้เลยครับ:\n1. กลมกล่อม\n2. ลดเค็ม\n3. สมุนไพร\n4. มันน้อย",
    });
  }

  // ดำเนินการตามขั้นตอนของ session
  if (session.step === 1) {
    updateSession(senderPsid, { product: text, step: 2 });
    return callSendAPI(senderPsid, {
      text: "เลือกประเภทไส้อั่ว:\n1. พร้อมทาน\n2. ซีลสุญญากาศ",
    });
  }

  if (session.step === 2) {
    updateSession(senderPsid, { type: text, step: 3 });
    return callSendAPI(senderPsid, {
      text: "ต้องการกี่กิโลกรัมครับ?",
    });
  }

  if (session.step === 3) {
    updateSession(senderPsid, { amount: text, step: 4 });
    return callSendAPI(senderPsid, {
      text: "ขอ ชื่อเล่น ด้วยครับ?",
    });
  }

  if (session.step === 4) {
    updateSession(senderPsid, { name: text, step: 5 });
    return callSendAPI(senderPsid, {
      text: "ขอเบอร์ด้วยครับ?",
    });
  }

  if (session.step === 5) {
    updateSession(senderPsid, { phone: text, step: 6 });
    return callSendAPI(senderPsid, {
      text: "ต้องการรับของแบบไหนครับ:\n1. นัดรับ\n2. จัดส่งถึงบ้าน",
    });
  }

  if (session.step === 6) {
    updateSession(senderPsid, { delivery: text, step: 7 });
    return callSendAPI(senderPsid, {
      text: "ขอพิกัดหรือสถานที่จัดส่งครับ?",
    });
  }

  if (session.step === 7) {
    updateSession(senderPsid, { location: text, step: 8 });
    return callSendAPI(senderPsid, {
      text: "วันที่และเวลาที่ต้องการรับของครับ?",
    });
  }

  if (session.step === 8) {
    updateSession(senderPsid, { date: text, step: 9 });
    return callSendAPI(senderPsid, {
      text: "มีข้อความเพิ่มเติมถึงร้านไหมครับ? (ถ้าไม่มี พิมพ์ - )",
    });
  }

  if (session.step === 9) {
    updateSession(senderPsid, { note: text, step: 10 });
    const summary = getSession(senderPsid);
    return callSendAPI(senderPsid, {
      text: `สรุปออเดอร์:\n- สูตร: ${summary.product}\n- ประเภท: ${summary.type}\n- ปริมาณ: ${summary.amount} กก.\n- ชื่อ: ${summary.name}\n- เบอร์: ${summary.phone}\n- วิธีรับของ: ${summary.delivery}\n- สถานที่: ${summary.location}\n- วันที่/เวลา: ${summary.date}\n- หมายเหตุ: ${summary.note}\n\nยืนยันการสั่งซื้อพิมพ์ "ยืนยัน" หรือ "ยกเลิก" เพื่อยกเลิก`,
    });
  }

  if (session.step === 10) {
    if (text === "ยืนยัน") {
      // บันทึก Google Sheets + แจ้ง LINE + ล้าง session
      callSendAPI(senderPsid, { text: "บ่าวน้อยได้รับออเดอร์แล้วนะครับ ขอบคุณมาก ๆ!" });
      clearSession(senderPsid);
    } else if (text === "ยกเลิก") {
      callSendAPI(senderPsid, { text: "ยกเลิกออเดอร์ให้แล้วครับ~" });
      clearSession(senderPsid);
    } else {
      callSendAPI(senderPsid, { text: "พิมพ์ \"ยืนยัน\" หรือ \"ยกเลิก\" เพื่อดำเนินการต่อนะครับ" });
    }
  }
}

function callSendAPI(senderPsid, response) {
  const requestBody = {
    recipient: { id: senderPsid },
    message: response,
  };

  const url = `https://graph.facebook.com/v17.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;

  axios
    .post(url, requestBody, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then(() => {
      console.log("Message sent!");
    })
    .catch((err) => {
      console.error("Unable to send message:", err.response?.data || err.message);
    });
}

module.exports = router;
