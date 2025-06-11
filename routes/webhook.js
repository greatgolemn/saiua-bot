const express = require("express");
const router = express.Router();
const generateGPTReply = require("../services/chatgpt");
const { getSession, updateSession, resetSession } = require("../services/session");
const { saveOrderToSheets } = require("../services/sheets");
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const axios = require("axios");

router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("WEBHOOK_VERIFIED");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

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
    const text = receivedMessage.text;
    if (!text) {
      return callSendAPI(senderPsid, {
        text: "ตอนนี้ยังไม่รองรับรูปภาพหรือเสียงนะครับ ลองพิมพ์เข้ามาใหม่ได้เลย~",
      });
    }

    let session = await getSession(senderPsid);
    if (!session.data) session.data = {};

    // ส่งคำถามของลูกค้า + session ปัจจุบันไปให้ GPT วิเคราะห์และตอบกลับ
    const gptResponse = await generateGPTReply(text, session.data);

    // ถ้ามีการสั่งให้ reset
    if (gptResponse.resetSession) {
      await resetSession(senderPsid);
    }

    // ถ้ามีการอัปเดตข้อมูลใน session
    if (gptResponse.updatedFields) {
      for (const [key, value] of Object.entries(gptResponse.updatedFields)) {
        await updateSession(senderPsid, key, value);
      }
    }

    // ถ้า GPT บอกว่าให้บันทึกออเดอร์
    if (gptResponse.confirmOrder) {
      const finalSession = await getSession(senderPsid);
      await saveOrderToSheets(senderPsid, finalSession.data);
      await callSendAPI(senderPsid, {
        text: "บ่าวน้อยบันทึกออเดอร์เรียบร้อยแล้วนะครับ ขอบคุณมาก ๆ เลย~ 🐷",
      });
      await resetSession(senderPsid);
      return;
    }

    // ส่งข้อความกลับจาก GPT
    if (gptResponse.reply) {
      await callSendAPI(senderPsid, { text: gptResponse.reply });
    } else {
      await callSendAPI(senderPsid, {
        text: "บ่าวน้อยงงนิดหน่อย ขอให้พิมพ์ใหม่อีกทีได้มั้ยครับ~",
      });
    }
  } catch (err) {
    console.error("🔥 ERROR in handleMessage:", err.stack || err.message || err);
    callSendAPI(senderPsid, {
      text: "ขอโทษครับ เกิดข้อผิดพลาด ลองใหม่อีกครั้งนะครับ",
    });
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
      console.log("✅ Message sent!");
    })
    .catch((err) => {
      console.error("❌ Unable to send message:", err.response?.data || err.message);
    });
}

module.exports = router;
