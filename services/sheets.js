
const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const SHEET_ID = process.env.SHEET_ID;

async function saveOrderToSheets(_, data) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  const values = [[
    data["ชื่อเล่น"] || "",
    data["เบอร์โทร"] || "",
    data["สูตร"] || "",
    data["ประเภท"] || "",
    data["ปริมาณ"] || "",
    data["วิธีรับของ"] || "",
    data["สถานที่จัดส่ง"] || "",
    data["วันเวลารับของ"] || "",
    data["ข้อความเพิ่มเติม"] || "",
    new Date().toISOString()
  ]];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Orders!A1',
    valueInputOption: 'RAW',
    resource: { values },
  });
}

module.exports = { saveOrderToSheets };
