// n8n may merge workflow context into the Code Tool query. Never forward it.
export function pcramSearchInput(input) {
  const keys = ["indice", "prefijo", "texto", "limite"];
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      !keys.every(key => Object.prototype.hasOwnProperty.call(input, key))) return null;
  const { indice, prefijo, texto, limite } = input;
  if (!Number.isInteger(indice) || indice < 1 || indice > 100 ||
      typeof prefijo !== "string" || prefijo.length > 15 ||
      typeof texto !== "string" || texto.length > 160 ||
      !Number.isInteger(limite) || limite < 1 || limite > 8) return null;
  return { indice, prefijo, texto, limite };
}
