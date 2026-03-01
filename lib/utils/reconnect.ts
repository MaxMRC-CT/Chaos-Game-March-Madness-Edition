const RECONNECT_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCodePart(length: number) {
  let value = "";
  for (let i = 0; i < length; i += 1) {
    const randomIndex = Math.floor(Math.random() * RECONNECT_CHARSET.length);
    value += RECONNECT_CHARSET[randomIndex];
  }
  return value;
}

export function generateReconnectCode() {
  return `${randomCodePart(4)}-${randomCodePart(4)}`;
}
