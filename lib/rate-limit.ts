const bucket = new Map<string, { at: number; count: number }>();
export function isLimited(ip: string): boolean {
  const now = Date.now();
  for (const [key, value] of bucket)
    if (now - value.at > 60000) bucket.delete(key);
  const cell = bucket.get(ip) || { at: now, count: 0 };
  cell.count++;
  bucket.set(ip, cell);
  if (bucket.size > 10000) bucket.delete(bucket.keys().next().value!);
  return cell.count > 10;
}
