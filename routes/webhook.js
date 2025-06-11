const express = require("express");
const router = express.Router();
const generateGPTReply = require("../services/chatgpt");
const { getSession, updateSession, nextStep, resetSession } = require("../services/session");
const { saveOrderToSheets } = require("../services/sheets");
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
    const text = receivedMessage.text;
    if (!text) {
      return callSendAPI(senderPsid, {
        text: "ตอนนี้ยังไม่รองรับรูปภาพหรือเสียงนะครับ ลองพิมพ์เข้ามาใหม่ได้เลย~",
      });
    }

    const session = await getSession(senderPsid);

    // Step 0: เริ่มต้น - ถามสูตร
    if (!session.step || session.step === 0) {
      await callSendAPI(senderPsid, {
        text: "คุณอยากสั่งสูตรแบบไหนครับ?
- กลมกล่อม
- ปรับสูตรเอง",
      });
      await nextStep(senderPsid);
    }
    // Step 1: เก็บสูตร
    else if (session.step === 1) {
      await updateSession(senderPsid, "สูตร", text);
      await nextStep(senderPsid);
      await callSendAPI(senderPsid, {
        text: "เลือกประเภท: พร้อมทาน หรือ ซีลสุญญากาศ ครับ~",
      });
    }
    // Step 2: เก็บประเภท
    else if (session.step === 2) {
      await updateSession(senderPsid, "ประเภท", text);
      await nextStep(senderPsid);
      await callSendAPI(senderPsid, {
        text: "ต้องการกี่กิโลกรัมครับ?",
      });
    }
    // Step 3: ปริมาณ
    else if (session.step === 3) {
      await updateSession(senderPsid, "ปริมาณ", text);
      await nextStep(senderPsid);
      await callSendAPI(senderPsid, {
        text: "ชื่อเล่นของคุณคืออะไรครับ?",
      });
    }
    // Step 4: ชื่อเล่น
    else if (session.step === 4) {
      await updateSession(senderPsid, "ชื่อเล่น", text);
      await nextStep(senderPsid);
      await callSendAPI(senderPsid, {
        text: "เบอร์โทรติดต่อได้คืออะไรครับ?",
      });
    }
    // Step 5: เบอร์โทร
    else if (session.step === 5) {
      await updateSession(senderPsid, "เบอร์โทร", text);
      await nextStep(senderPsid);
      await callSendAPI(senderPsid, {
        text: "ต้องการนัดรับหรือจัดส่งดีครับ?",
      });
    }
    // Step 6: วิธีรับของ
    else if (session.step === 6) {
      await updateSession(senderPsid, "วิธีรับของ", text);
      await nextStep(senderPsid);
      await callSendAPI(senderPsid, {
        text: "ระบุพิกัดหรือที่อยู่จัดส่งให้บ่าวน้อยหน่อยนะครับ~",
      });
    }
    // Step 7: ที่อยู่
    else if (session.step === 7) {
      await updateSession(senderPsid, "สถานที่จัดส่ง", text);
      await nextStep(senderPsid);
      await callSendAPI(senderPsid, {
        text: "วันที่และเวลาที่อยากรับของคือเมื่อไหร่ดีครับ?",
      });
    }
    // Step 8: วันเวลา
    else if (session.step === 8) {
      await updateSession(senderPsid, "วันเวลารับของ", text);
      await nextStep(senderPsid);
      await callSendAPI(senderPsid, {
        text: "มีอะไรอยากบอกเพิ่มเติมถึงร้านมั้ยครับ?",
      });
    }
    // Step 9: ข้อความเพิ่มเติม
    else if (session.step === 9) {
      await updateSession(senderPsid, "ข้อความเพิ่มเติม", text);
      const finalSession = await getSession(senderPsid);
      const summary = Object.entries(finalSession)
        .map(([key, value]) => `• ${key}: ${value}`)
        .join("\n");

      await callSendAPI(senderPsid, {
        text: `สรุปออเดอร์ของคุณ:\n${summary}\n\nพิมพ์ว่า "ยืนยัน" เพื่อยืนยัน หรือ "เริ่มใหม่" หากต้องการแก้ไขครับ~`,
      });
      await nextStep(senderPsid);
    }
    // Step 10: ยืนยัน
    else if (session.step === 10) {
      if (/^ยืนยัน$/i.test(text)) {
        const finalSession = await getSession(senderPsid);
        await saveOrderToSheets(senderPsid, finalSession);
        await callSendAPI(senderPsid, {
          text: "รับออเดอร์เรียบร้อย ขอบคุณครับ! บ่าวน้อยจะเตรียมให้อย่างดีที่สุดเลย~",
        });
        await resetSession(senderPsid);
      } else {
        await callSendAPI(senderPsid, {
          text: "บ่าวน้อยล้างข้อมูลให้นะครับ เริ่มต้นใหม่เลย~",
        });
        await resetSession(senderPsid);
      }
    }
    // ไม่เข้าเงื่อนไข = ให้ GPT ตอบ
    else {
      const reply = await generateGPTReply(text);
      await callSendAPI(senderPsid, { text: reply });
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
