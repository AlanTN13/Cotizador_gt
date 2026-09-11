import { it, expect, vi, afterEach } from "vitest";
import { POST } from "../app/api/cotizaciones/route";
vi.mock("../lib/rate-limit", () => ({ isLimited: () => false }));
const request = (body: unknown, origin = "https://preview.example.com") =>
  new Request("https://localhost:3000/api/cotizaciones", {
    method: "POST",
    headers: {
      host: "preview.example.com",
      origin,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
afterEach(() => vi.unstubAllEnvs());
it("same host accepted through framework internal URL, malformed fields actionable", async () => {
  const response = await POST(request({}));
  expect(response.status).toBe(400);
  expect((await response.json()).code).toBe("INVALID_FIELDS");
});
it("different origin rejected", async () =>
  expect((await POST(request({}, "https://other.example.com"))).status).toBe(
    403,
  ));
it("oversized body rejected before parsing", async () =>
  expect((await POST(request({ description: "x".repeat(51000) }))).status).toBe(
    413,
  ));
it("invalid JSON is actionable", async () => {
  const response = await POST(
    new Request("https://preview.example.com/api/cotizaciones", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "broken",
    }),
  );
  expect(response.status).toBe(400);
  expect((await response.json()).code).toBe("INVALID_JSON");
});
