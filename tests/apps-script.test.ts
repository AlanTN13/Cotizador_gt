import { it, expect } from "vitest";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
function harness() {
  const rows: unknown[][] = [["Header"]];
  let locked = false;
  const sheet = {
    getLastRow: () => rows.length,
    getRange(row: number, col: number) {
      return {
        createTextFinder(id: string) {
          return {
            matchEntireCell() {
              return {
                findNext: () => {
                  const i = rows.findIndex((r) => r[0] === id);
                  return i > 0 ? { getRow: () => i + 1 } : null;
                },
              };
            },
          };
        },
        getValues: () => [rows[row - 1]],
      };
    },
    appendRow: (r: unknown[]) => rows.push(r),
  };
  const context = vm.createContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k: string) =>
          k === "COURIER_SECRET" ? "fixture-secret" : "fixture-sheet",
      }),
    },
    Utilities: {
      computeHmacSha256Signature: (body: string, key: string) =>
        Array.from(createHmac("sha256", key).update(body).digest()),
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => {
          locked = true;
          return true;
        },
        releaseLock: () => {
          locked = false;
        },
      }),
    },
    SpreadsheetApp: {
      openById: () => ({ getSheetByName: () => sheet }),
      flush: () => {},
    },
    ContentService: {
      createTextOutput: (text: string) => ({
        setMimeType: () => JSON.parse(text),
      }),
      MimeType: { JSON: "application/json" },
    },
  });
  vm.runInContext(
    readFileSync("google-apps-script/courier-registry.gs", "utf8"),
    context,
  );
  function post(payload: unknown, stale = false, bad = false) {
    const body = JSON.stringify({
      timestamp: Date.now() - (stale ? 600000 : 0),
      payload,
    });
    return context.doPost({
      postData: {
        contents: JSON.stringify({
          body,
          signature: bad
            ? "wrong"
            : createHmac("sha256", "fixture-secret").update(body).digest("hex"),
        }),
      },
    });
  }
  return { rows, post, isLocked: () => locked };
}
it("actual Apps Script code authenticates, persists, deduplicates and detects conflicts", () => {
  const h = harness();
  const id = "9b7be7a7-0664-4da2-95cb-5cc1c533b777",
    hash = "a".repeat(64);
  const payload = {
    action: "commit",
    record: {
      requestId: id,
      fingerprint: hash,
      result: { requestId: id, status: "REQUIERE_REVISION", simulation: true },
      submission: { contact: { name: "=formula", email: "qa@example.com" } },
    },
  };
  expect(h.post(payload, false, true).ok).toBe(false);
  expect(h.post(payload, true).ok).toBe(false);
  expect(h.rows).toHaveLength(1);
  const r = h.post(payload);
  expect(r.result.recorded).toBe(true);
  expect(h.post(payload)).toEqual(r);
  expect(h.rows).toHaveLength(2);
  expect(h.rows[1][5]).toBe("'=formula");
  expect(h.post({ action: "get", id, fingerprint: hash })).toEqual(r);
  expect(h.post({ action: "get", id, fingerprint: "b".repeat(64) }).code).toBe(
    "IDEMPOTENCY_CONFLICT",
  );
  expect(h.isLocked()).toBe(false);
});
it("labels preview records as tests and preserves zero and readable multi-product summaries", () => {
  const h = harness();
  const id = "9b7be7a7-0664-4da2-95cb-5cc1c533b778";
  const response = h.post({
    action: "commit",
    record: {
      requestId: id,
      fingerprint: "c".repeat(64),
      environment: "preview",
      result: {
        requestId: id,
        status: "COTIZADO",
        simulation: false,
        calculation: { totalServiceUsd: 0 },
        reasons: [{ message: "@Texto sin ejecutar" }],
      },
      submission: {
        contact: { name: "QA", email: "qa@example.com" },
        products: [
          { description: "=Producto A", valueUsd: 100 },
          { description: "Producto B", valueUsd: 50 },
        ],
        parcels: [{ quantity: 2 }, { quantity: 3 }],
      },
    },
  });
  expect(response.ok).toBe(true);
  expect(h.rows[1].slice(9)).toEqual([
    "PRUEBA", "'=Producto A | Producto B", 150, 5, 0, "'@Texto sin ejecutar",
  ]);
});
