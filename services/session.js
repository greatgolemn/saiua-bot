
const sessions = {};

function initSession(userId) {
  sessions[userId] = { step: 0, data: {} };
}

function getSession(userId) {
  if (!sessions[userId]) initSession(userId);
  return sessions[userId];
}

function updateSession(userId, key, value) {
  if (!sessions[userId]) initSession(userId);
  sessions[userId].data[key] = value;
}

function resetSession(userId) {
  delete sessions[userId];
}

module.exports = {
  getSession,
  updateSession,
  resetSession
};
