// session.js
// ใช้เก็บสถานะการสั่งซื้อของแต่ละผู้ใช้ใน memory

const sessions = {};

function initSession(userId) {
  sessions[userId] = {
    step: 0,
    data: {}
  };
}

function getSession(userId) {
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

module.exports = {
  initSession,
  getSession,
  updateSession,
  nextStep,
  resetSession,
};
