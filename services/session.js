const sessions = {};

function getSession(senderId) {
  if (!sessions[senderId]) {
    sessions[senderId] = { step: 0, data: {} };
  }
  return sessions[senderId];
}

function resetSession(senderId) {
  delete sessions[senderId];
}

module.exports = { getSession, resetSession };
