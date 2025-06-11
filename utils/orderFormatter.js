function formatOrderText(data) {
  return `
📦 ออเดอร์ใหม่จาก ${data.nickname}
🧂 สูตร: ${data.recipe}
📦 ประเภท: ${data.type}
⚖️ ปริมาณ: ${data.amount} กก.
🚚 รับของแบบ: ${data.delivery}
📍 สถานที่: ${data.location}
🕒 เวลา: ${data.datetime}
📝 ข้อความเพิ่มเติม: ${data.notes}
📱 โทร: ${data.phone}
  `;
}

module.exports = { formatOrderText };
