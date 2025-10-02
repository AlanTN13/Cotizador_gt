const WINDOW = Number(process.env.RATE_LIMIT_WINDOW || 60) * 1000; // ms
const TOKENS = Number(process.env.RATE_LIMIT_TOKENS || 10);
const bucket: Record<string, { t: number; c: number }> = {};

export function isLimited(ip: string): boolean {
  const now = Date.now();
  const cell = bucket[ip] || { t: now, c: 0 };
  if (now - cell.t > WINDOW) {
    bucket[ip] = { t: now, c: 1 };
    return false;
  }
  if (cell.c >= TOKENS) return true;
  cell.c += 1;
  bucket[ip] = cell;
  return false;
}
