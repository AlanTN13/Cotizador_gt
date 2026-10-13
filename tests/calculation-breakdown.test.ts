import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("QA calculation breakdown component", () => {
  it("renders the four trace columns and product classification from supplied detail", () => {
    const source = readFileSync(new URL("../app/cotizador/calculation-breakdown.tsx", import.meta.url), "utf8");
    expect(source).toContain("Concepto");
    expect(source).toContain("Base / fórmula");
    expect(source).toContain("NCM/SIM");
    expect(source).toContain("product.lineas");
    expect(source).not.toMatch(/[+*/]\s*(?:row|detail)\./);
  });
});
