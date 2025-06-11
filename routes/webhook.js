// routes/webhook.js
const express = require("express");
const router = express.Router();
const generateGPTReply = require("../services/chatgpt");
const { getSession, updateSession, nextStep, resetSession } = require("../services/session");
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const axios = require("axios");

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

async function handleMessage(senderPsid, receivedMessage) {
  try {
    const session = await getSession(senderPsid);

    if (!session.step || session.step === 0) {
      await updateSession(senderPsid, "สูตร", receivedMessage.text);
      await nextStep(senderPsid);
      callSendAPI(senderPsid, { text: "เลือกประเภท: พร้อมทาน หรือ ซีลสุญญากาศ" });
    } else if (session.step === 1) {
      await updateSession(senderPsid, "ประเภท", receivedMessage.text);
      await nextStep(senderPsid);
      callSendAPI(senderPsid, { text: "ต้องการกี่กิโลกรัมครับ" });
    } else if (session.step === 2) {
      await updateSession(senderPsid, "ปริมาณ", receivedMessage.text);
      await nextStep(senderPsid);
      callSendAPI(senderPsid, { text: "ชื่อเล่นของคุณ?" });
    } else if (session.step === 3) {
      await updateSession(senderPsid, "ชื่อเล่น", receivedMessage.text);
      await nextStep(senderPsid);
      callSendAPI(senderPsid, { text: "เบอร์โทรติดต่อได้?" });
    } else if (session.step === 4) {
      await updateSession(senderPsid, "เบอร์โทร", receivedMessage.text);
      await nextStep(senderPsid);
      callSendAPI(senderPsid, { text: "ต้องการนัดรับหรือจัดส่ง?" });
    } else if (session.step === 5) {
      await updateSession(senderPsid, "วิธีรับของ", receivedMessage.text);
      await nextStep(senderPsid);
      callSendAPI(senderPsid, { text: "ระบุพิกัดหรือที่อยู่จัดส่ง" });
    } else if (session.step === 6) {
      await updateSession(senderPsid, "สถานที่จัดส่ง", receivedMessage.text);
      await nextStep(senderPsid);
      callSendAPI(senderPsid, { text: "วันที่และเวลาที่ต้องการรับของ?" });
    } else if (session.step === 7) {
      await updateSession(senderPsid, "วันเวลารับของ", receivedMessage.text);
      await nextStep(senderPsid);
      callSendAPI(senderPsid, { text: "มีอะไรอยากบอกเพิ่มเติมถึงร้านมั้ยครับ?" });
    } else if (session.step === 8) {
      await updateSession(senderPsid, "ข้อความเพิ่มเติม", receivedMessage.text);
      const finalSession = await getSession(senderPsid);
      const summary = Object.entries(finalSession)
        .map(([key, value]) => `• ${key}: ${value}`)
        .join("\n");

      callSendAPI(senderPsid, {
        text: `สรุปออเดอร์ของคุณ:\n${summary}\n\nยืนยันพิมพ์ว่า \"ยืนยัน\" หรือ \"เริ่มใหม่\" หากต้องการแก้ไข`
      });
      await nextStep(senderPsid);
    } else if (session.step === 9) {
      if (/^ยืนยัน$/i.test(receivedMessage.text)) {
        // ✅ บันทึก Google Sheets (ยังไม่เขียน)
        callSendAPI(senderPsid, { text: "รับออเดอร์เรียบร้อย ขอบคุณครับ!" });
        await resetSession(senderPsid);
      } else {
        callSendAPI(senderPsid, { text: "ยกเลิกออเดอร์ และเริ่มต้นใหม่ครับ~" });
        await resetSession(senderPsid);
      }
    }
  } catch (err) {
    console.error("handleMessage error:", err);
    callSendAPI(senderPsid, { text: "ขอโทษครับ เกิดข้อผิดพลาด ลองใหม่อีกครั้งนะครับ" });
  }
}

function callSendAPI(senderPsid, response) {
  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
  const url = `https://graph.facebook.com/v17.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;

  const requestBody = {
    recipient: { id: senderPsid },
    message: response,
  };

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
