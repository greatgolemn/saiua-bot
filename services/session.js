// session.js
// ใช้เก็บสถานะการสั่งซื้อของแต่ละผู้ใช้ใน Google Sheets

const { google } = require("googleapis");
const auth = new google.auth.GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = "Session";

async function getSheet() {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });
  return sheets;
}

function initEmptyRow(userId) {
  return [userId, "0", "", "", "", "", "", "", "", ""];
}

async function getSession(userId) {
  const sheets = await getSheet();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:J`,
  });

  const rows = res.data.values || [];
  const row = rows.find(r => r[0] === userId);

  if (!row) return null;

  return {
    step: parseInt(row[1]) || 0,
    product: row[2],
    type: row[3],
    amount: row[4],
    name: row[5],
    phone: row[6],
    delivery: row[7],
    location: row[8],
    date: row[9],
    note: row[10] || ""
  };
}

async function updateSession(userId, update) {
  const sheets = await getSheet();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:K`,
    majorDimension: "ROWS",
  });

  const rows = res.data.values || [];
  const index = rows.findIndex(r => r[0] === userId);

  const current = index >= 0 ? rows[index] : initEmptyRow(userId);

  const newRow = [
    userId,
    update.step !== undefined ? update.step.toString() : current[1],
    update.product || current[2],
    update.type || current[3],
    update.amount || current[4],
    update.name || current[5],
    update.phone || current[6],
    update.delivery || current[7],
    update.location || current[8],
    update.date || current[9],
    update.note || current[10]
  ];

  const range = `${SHEET_NAME}!A${index + 2}:K${index + 2}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "RAW",
    requestBody: {
      values: [newRow],
    },
  });
}

async function clearSession(userId) {
  const sheets = await getSheet();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:A`,
  });

  const rows = res.data.values || [];
  const index = rows.findIndex(r => r[0] === userId);
  if (index < 0) return;

  const range = `${SHEET_NAME}!A${index + 2}:K${index + 2}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "RAW",
    requestBody: {
      values: [["", "", "", "", "", "", "", "", "", "", ""]],
    },
  });
}

module.exports = {
  getSession,
  updateSession,
  clearSession,
};
