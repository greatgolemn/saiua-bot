// session.js
// ใช้เก็บสถานะการสั่งซื้อของแต่ละผู้ใช้ใน Google Sheets

const { google } = require("googleapis");
const SPREADSHEET_ID = process.env.SHEET_ID;
const SHEET_NAME = "Sessions"; // คุณต้องสร้างชีตนี้ไว้ใน Google Sheets

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
  keyFile: "/etc/secrets/credentials.json", // path ที่เราตั้งไว้ตอนอัปโหลด
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
  const authClient = await auth.getClient();
  return google.sheets({ version: "v4", auth: authClient });
}

async function initSession(userId) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[userId, 0, JSON.stringify({})]],
    },
  });
}

async function getSession(userId) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: SHEET_NAME,
  });

  const rows = res.data.values || [];
  for (const row of rows) {
    if (row[0] === userId) {
      return {
        step: parseInt(row[1], 10),
        ...JSON.parse(row[2] || "{}"),
      };
    }
  }
  await initSession(userId);
  return { step: 0 };
}

async function updateSession(userId, key, value) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: SHEET_NAME,
  });

  const rows = res.data.values || [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === userId) {
      const currentStep = parseInt(rows[i][1], 10);
      const currentData = JSON.parse(rows[i][2] || "{}");
      currentData[key] = value;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A${i + 1}:C${i + 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[userId, currentStep, JSON.stringify(currentData)]],
        },
      });
      return;
    }
  }
  await initSession(userId);
  await updateSession(userId, key, value);
}

async function nextStep(userId) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: SHEET_NAME,
  });

  const rows = res.data.values || [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === userId) {
      const newStep = parseInt(rows[i][1], 10) + 1;
      const currentData = rows[i][2];
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A${i + 1}:C${i + 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[userId, newStep, currentData]],
        },
      });
      return;
    }
  }
}

async function resetSession(userId) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: SHEET_NAME,
  });

  const rows = res.data.values || [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === userId) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A${i + 1}:C${i + 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[userId, 0, JSON.stringify({})]],
        },
      });
      return;
    }
  }
}

module.exports = {
  getSession,
  updateSession,
  nextStep,
  resetSession,
};
