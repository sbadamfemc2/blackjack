// Unambiguous character set: A-Z minus O/I/S (look like 0/1/5) + digits minus 0/1/5
const CHARS = 'ABCDEFGHJKLMNPQRTUVWXYZ2346789'; // 29 chars

const CODE_LENGTH = 6;

export function generateRoomCode(): string {
  const arr = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(arr);
  return Array.from(arr, (byte) => CHARS[byte % CHARS.length]).join('');
}
