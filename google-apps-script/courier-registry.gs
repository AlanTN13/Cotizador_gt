/** Dedicated preview registry. Script properties: COURIER_SHEET_ID, COURIER_SECRET.
 * No email sending. One immutable row per request; review queue owned by cotizaciones.
 */
function doPost(e) {
  try {
    var outer = JSON.parse(e.postData.contents),
      secret =
        PropertiesService.getScriptProperties().getProperty("COURIER_SECRET");
    if (!secret || typeof outer.body !== "string" || outer.body.length > 60000)
      return reply_({ ok: false });
    var expected = Utilities.computeHmacSha256Signature(outer.body, secret)
      .map(function (b) {
        return ("0" + ((b + 256) % 256).toString(16)).slice(-2);
      })
      .join("");
    var difference = 0,
      supplied = String(outer.signature || "");
    if (supplied.length !== expected.length) return reply_({ ok: false });
    for (var i = 0; i < expected.length; i++)
      difference |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
    if (difference) return reply_({ ok: false });
    var message = JSON.parse(outer.body);
    if (
      typeof message.timestamp !== "number" ||
      !isFinite(message.timestamp) ||
      Math.abs(Date.now() - message.timestamp) > 300000
    )
      return reply_({ ok: false });
    var p = message.payload,
      lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return reply_({ ok: false, code: "BUSY" });
    try {
      var sheet = SpreadsheetApp.openById(
        PropertiesService.getScriptProperties().getProperty("COURIER_SHEET_ID"),
      ).getSheetByName("Solicitudes");
      if (!sheet) return reply_({ ok: false, code: "NOT_CONFIGURED" });
      var id = p.action === "get" ? p.id : p.record.requestId,
        hash = p.action === "get" ? p.fingerprint : p.record.fingerprint;
      if (!/^[a-f0-9-]{36}$/i.test(id) || !/^[a-f0-9]{64}$/.test(hash))
        return reply_({ ok: false });
      var found =
        sheet.getLastRow() > 1
          ? sheet
              .getRange(2, 1, sheet.getLastRow() - 1, 1)
              .createTextFinder(id)
              .matchEntireCell(true)
              .findNext()
          : null;
      if (found) {
        var row = sheet.getRange(found.getRow(), 1, 1, 10).getValues()[0];
        if (row[1] !== hash)
          return reply_({ ok: false, code: "IDEMPOTENCY_CONFLICT" });
        return reply_({ ok: true, result: JSON.parse(row[8]) });
      }
      if (p.action === "get") return reply_({ ok: true, result: null });
      if (
        p.action !== "commit" ||
        !p.record ||
        p.record.result.requestId !== id
      )
        return reply_({ ok: false });
      var r = p.record,
        result = r.result;
      result.recorded = true;
      if (
        ["COTIZADO", "REQUIERE_REVISION", "NO_APTO_COURIER"].indexOf(
          result.status,
        ) < 0
      )
        return reply_({ ok: false });
      var submission = JSON.stringify(r.submission),
        output = JSON.stringify(result);
      if (submission.length > 45000 || output.length > 45000)
        return reply_({ ok: false });
      sheet.appendRow([
        id,
        hash,
        new Date().toISOString(),
        result.status,
        "cotizaciones",
        safe_(r.submission.contact.name),
        safe_(r.submission.contact.email),
        submission,
        output,
        r.environment === "preview" || result.simulation ? "PRUEBA" : "OPERATIVO",
        safe_((r.submission.products || []).map(function(p) { return p.description || p.url; }).join(" | ")),
        (r.submission.products || []).reduce(function(sum, p) { return sum + p.valueUsd; }, 0),
        (r.submission.parcels || []).reduce(function(sum, p) { return sum + p.quantity; }, 0),
        result.calculation ? result.calculation.totalServiceUsd : "",
        safe_((result.reasons || []).map(function(r) { return r.message; }).join(" | ")),
      ]);
      SpreadsheetApp.flush();
      return reply_({ ok: true, result: result });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return reply_({ ok: false, code: "REGISTRY_ERROR" });
  }
}
function safe_(s) {
  return /^[=+@-]/.test(String(s)) ? "'" + s : s;
}
function reply_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
function setupCourierRegistry() {
  var ss = SpreadsheetApp.openById(
    PropertiesService.getScriptProperties().getProperty("COURIER_SHEET_ID"),
  );
  var sheet = ss.getSheetByName("Solicitudes") || ss.insertSheet("Solicitudes");
  if (!sheet.getLastRow()) {
    sheet.appendRow([
      "Solicitud",
      "Huella",
      "Fecha",
      "Estado",
      "Equipo",
      "Nombre",
      "Email",
      "Entrada JSON",
      "Resultado JSON",
      "Entorno",
      "Productos",
      "Valor FOB USD",
      "Bultos",
      "Total servicio USD",
      "Motivos",
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 15).setFontWeight("bold");
    sheet.getRange(1, 1, sheet.getMaxRows(), 2).setNumberFormat("@");
    sheet.getRange(1, 8, sheet.getMaxRows(), 2).setNumberFormat("@");
    sheet.getRange(1, 1, sheet.getMaxRows(), 15).createFilter();
  }
}
