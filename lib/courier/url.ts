import { lookup } from "node:dns/promises";
import { request } from "node:https";
export function publicIpv4(ip: string) {
  const a = ip.split(".").map(Number);
  if (a.length !== 4 || a.some((v) => !Number.isInteger(v) || v < 0 || v > 255))
    return false;
  return !(
    a[0] === 0 ||
    a[0] === 10 ||
    a[0] === 127 ||
    a[0] >= 224 ||
    (a[0] === 169 && a[1] === 254) ||
    (a[0] === 172 && a[1] >= 16 && a[1] <= 31) ||
    (a[0] === 192 && (a[1] === 168 || a[1] === 0 || a[1] === 2)) ||
    (a[0] === 100 && a[1] >= 64 && a[1] <= 127) ||
    (a[0] === 198 && (a[1] === 18 || a[1] === 19 || a[1] === 51)) ||
    (a[0] === 203 && a[1] === 0 && a[2] === 113)
  );
}
export async function readProductUrl(raw: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    return await read(raw, controller.signal, 0);
  } finally {
    clearTimeout(timer);
  }
}
async function read(
  raw: string,
  signal: AbortSignal,
  redirects: number,
): Promise<string> {
  const url = new URL(raw);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    redirects > 3
  )
    throw Error("URL_NOT_SUPPORTED");
  const addresses = await new Promise<{ address: string; family: number }[]>(
    (resolve, reject) => {
      const aborted = () => reject(Error("URL_TIMEOUT"));
      signal.addEventListener("abort", aborted, { once: true });
      lookup(url.hostname, { family: 4, all: true })
        .then(resolve, reject)
        .finally(() => signal.removeEventListener("abort", aborted));
    },
  );
  signal.throwIfAborted();
  const entries = Array.isArray(addresses) ? addresses : [addresses];
  if (!entries.length || entries.some((a) => !publicIpv4(a.address)))
    throw Error("URL_NOT_PUBLIC");
  const response = await new Promise<{
    status: number;
    location?: string;
    type: string;
    text: string;
  }>((resolve, reject) => {
    const req = request(
      url,
      {
        method: "GET",
        signal,
        headers: {
          "User-Agent": "GlobalTrip-ProductReader/1.0",
          Accept: "text/html,text/plain",
          "Accept-Encoding": "identity",
        },
        lookup: ((_host: unknown, options: { all?: boolean }, cb: Function) =>
          options.all
            ? cb(null, [entries[0]])
            : cb(null, entries[0].address, 4)) as never,
      },
      (res) => {
        let bytes = 0;
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > 300000) {
            res.destroy(Error("PAGE_TOO_LARGE"));
            return;
          }
          chunks.push(chunk);
        });
        res.on("error", reject);
        res.on("end", () =>
          resolve({
            status: res.statusCode || 0,
            location: res.headers.location,
            type: res.headers["content-type"] || "",
            text: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      },
    );
    req.on("error", reject);
    req.end();
  });
  if (response.status >= 300 && response.status < 400 && response.location)
    return read(
      new URL(response.location, url).toString(),
      signal,
      redirects + 1,
    );
  if (response.status !== 200 || !/^text\/(html|plain)/i.test(response.type))
    throw Error("URL_UNAVAILABLE");
  return response.text
    .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 15000);
}
