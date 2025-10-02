export function getClientIP(headers: Headers): string {
    const raw = headers.get("x-forwarded-for") || "";
    const ip = raw.split(",")[0].trim();
    return ip || "0.0.0.0";
  }
  