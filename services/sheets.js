const { google } = require('googleapis');
const path = require('path');

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const SHEET_ID = process.env.SHEET_ID;

async function getRecipesFromSheet() {
  const client = await auth.getClient();
  const sheetsAPI = google.sheets({ version: 'v4', auth: client });

  const response = await sheetsAPI.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Recipes!A2:A',
  });

  const rows = response.data.values;
  return rows ? rows.map((row) => row[0]) : [];
}

async function appendOrderToSheet(data) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  const values = [[
    data.nickname,
    data.phone,
    data.recipe,
    data.type,
    data.amount,
    data.delivery,
    data.location,
    data.datetime,
    data.notes,
    new Date().toISOString()
  ]];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Orders!A1',
    valueInputOption: 'RAW',
    resource: { values },
  });
}

module.exports = { getRecipesFromSheet, appendOrderToSheet };
refactor: use env for Google credentials
