const { GoogleSpreadsheet } = require('google-spreadsheet');

const sessions = {};

// ✅ โหลดเอกสารจาก Google Sheets ด้วย env
async function loadSheet() {
  const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID);
  const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
  return doc.sheetsByIndex[0]; // ใช้ sheet แรก
}

function initSession(userId) {
  sessions[userId] = {
    step: 0,
    data: {},
  };
}

function getSession(userId) {
  if (!sessions[userId]) initSession(userId);
  return sessions[userId];
}

function updateSession(userId, key, value) {
  if (!sessions[userId]) initSession(userId);
  sessions[userId].data[key] = value;
}

function nextStep(userId) {
  if (!sessions[userId]) initSession(userId);
  sessions[userId].step += 1;
}

function resetSession(userId) {
  delete sessions[userId];
}

// ✅ เพิ่ม: บันทึกข้อมูลลง Google Sheets
async function saveToGoogleSheet(userId) {
  const sheet = await loadSheet();
  const session = sessions[userId];
  if (!session) return;

  const data = session.data;

  await sheet.addRow({
    Timestamp: new Date().toLocaleString('th-TH'),
    Product: data.product || '',
    Type: data.type || '',
    Amount: data.amount || '',
    Name: data.name || '',
    Phone: data.phone || '',
    Delivery: data.delivery || '',
    Location: data.location || '',
    DateTime: data.date || '',
    Note: data.note || '',
  });
}

module.exports = {
  initSession,
  getSession,
  updateSession,
  nextStep,
  resetSession,
  saveToGoogleSheet, // ✅ export ไปใช้ตอน "ยืนยัน"
};
