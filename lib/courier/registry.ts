import { createHmac } from "node:crypto";
import { CourierError } from "./types";
import type { RecordEnvelope, Registry, Result } from "./types";
export class SheetRegistry implements Registry {
  async call(payload: unknown) {
    const url = process.env.COURIER_REGISTRY_URL,
      secret = process.env.COURIER_REGISTRY_SECRET;
    if (!url || !secret)
      throw new CourierError(
        "REGISTRY_UNAVAILABLE",
        "No pudimos conectar con el registro. Tus datos siguen en el formulario; volvé a intentar.",
      );
    const body = JSON.stringify({ timestamp: Date.now(), payload });
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, signature }),
        signal: AbortSignal.timeout(12000),
        redirect: "follow",
        cache: "no-store",
      });
      if (!response.ok) throw Error("Registry HTTP");
      const data = await response.json();
      if (data.code === "IDEMPOTENCY_CONFLICT")
        throw new CourierError(
          data.code,
          "La solicitud cambió. Volvé a enviarla con los datos actualizados.",
          409,
        );
      if (!data.ok) throw Error("Registry rejected");
      return data;
    } catch (e) {
      if (e instanceof CourierError) throw e;
      throw new CourierError(
        "REGISTRY_UNAVAILABLE",
        "No pudimos guardar tu solicitud. Conservamos los datos; volvé a intentar.",
      );
    }
  }
  async get(id: string, fingerprint: string) {
    const data = await this.call({ action: "get", id, fingerprint });
    return data.result as Result | null;
  }
  async commit(record: RecordEnvelope) {
    const data = await this.call({ action: "commit", record });
    if (!data.result?.recorded || data.result.requestId !== record.requestId)
      throw new CourierError(
        "REGISTRY_UNAVAILABLE",
        "El registro no confirmó la solicitud. Volvé a intentar.",
      );
    return data.result as Result;
  }
}
