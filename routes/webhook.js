const express = require("express");
const router = express.Router();
const generateGPTReply = require("../services/chatgpt"); // ✅ เรียกใช้ GPT
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

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

// ✅ ฟังก์ชันตอบข้อความด้วย GPT
async function handleMessage(senderPsid, receivedMessage) {
  if (receivedMessage.text) {
    const reply = await generateGPTReply(receivedMessage.text);
    callSendAPI(senderPsid, { text: reply });
  }
}

// ✅ ส่งข้อความกลับไปหา Facebook
function callSendAPI(senderPsid, response) {
  const requestBody = {
    recipient: { id: senderPsid },
    message: response,
  };

  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

  const axios = require("axios");

function callSendAPI(senderPsid, response) {
  const requestBody = {
    recipient: { id: senderPsid },
    message: response,
  };

  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

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
