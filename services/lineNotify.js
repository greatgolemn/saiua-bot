const axios = require('axios');

async function sendLineNotify(message) {
  const token = process.env.LINE_NOTIFY_TOKEN;
  const res = await axios.post(
    'https://notify-api.line.me/api/notify',
    new URLSearchParams({ message }),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  return res.data;
}

module.exports = { sendLineNotify };
