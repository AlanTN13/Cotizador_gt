import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "docs/evidence/nomenclator-agent-2026-10-08");
const indexPath = process.argv[2];
if (!indexPath) throw new Error("Usage: node scripts/prepare-nomenclator-agent.mjs <versioned-index.json>");
const indexBytes = readFileSync(indexPath);
const index = JSON.parse(indexBytes);
const hash = value => createHash("sha256").update(value).digest("hex");
const baseline = JSON.parse(readFileSync(path.join(dir, "baseline.workflow.json")));
const node = (w, name) => w.nodes.find(n => n.name === name);
const agent = node(baseline, "Agente Despachante");
const before = agent.parameters.options.systemMessage;
if (baseline.versionId !== "f2ea74d7-7b65-472b-9d5f-441595fc6e90" || baseline.nodes.length !== 11 ||
    hash(before) !== "591e95229b5d67e15809bfcef8ba30cd97e0c170ddced1e52558a62dbf378c11" ||
    hash(node(baseline, "Cotizador deterministico").parameters.jsCode) !== "dd9319fd8ca58633fba944cc31c9d67a1b41a0114453bc68a4c37ea1e91ce7de") throw new Error("Baseline mismatch");
if (index.metadata.schema !== "pcram-nomenclator-fixed-2134-v1" || index.sims.length !== index.metadata.record_count) throw new Error("Index mismatch");

const instruction = `
Consulta local al nomenclador: está conectada la herramienta de sólo lectura Consulta_nomenclador_PCRAM. Antes de entregar cada clasificación, consultala con el indice del producto, prefijo arancelario sustentable si lo tenés, y términos descriptivos genéricos verificables en texto; no uses marca ni tasa como criterio de selección. Los campos de entrada son indice, prefijo, texto y limite (1 a 8). Prefijo puede ser vacío, HS4/6, NCM8 o SIM completo; no rellenes códigos. Usá como máximo dos consultas por producto: una para candidatos y, cuando haga falta, otra más acotada o con el identificador exacto elegido. Si no hay coincidencias, conservá el nivel parcial sustentable o null y la estimación explícita.
La consulta devuelve códigos existentes, descripción SIM, contexto NCM literal, versión/hash de la transferencia, fecha de actualización y límites. Son candidatos, no una clasificación aprobada. Contrastá atributos observados con las condiciones de la apertura; si falta composición, tecnología u otro atributo decisivo, no lo supongas y no selecciones una apertura residual por descarte. Contexto concatenado no equivale a notas legales; textos truncados no se completan. Ver el nombre en una URL no prueba que hayas leído Alibaba. Mantené las consultas web ya disponibles para observar atributos cuando sea posible y distinguí acceso comprobado de información incompleta.
Antes de devolver NCM8 o SIM, asegurate de que ese código exacto esté entre los candidatos devueltos para ese producto. Para la posición sustentada, usá en evidencia el source_uri devuelto y describí el atributo compatible; en fundamento indicá también las condiciones faltantes y el nivel parcial si corresponde. Un código real no prueba correspondencia semántica. No elijas por parecido del nombre, marca, alícuota o por unos pocos resultados. partial=true señala resultados omitidos, no homogeneidad tributaria. La herramienta no devuelve impuestos: DIE numérico sigue siendo estimación orientativa y no AEC; el Tax Resolver posterior decide los tributos desde sus fuentes congeladas. No inventes consultas, posiciones ni tasas ni fuerces SIM. No agregues campos al contrato de salida existente.
`;
const candidate = structuredClone(baseline);
const candidateAgent = node(candidate, "Agente Despachante");
candidateAgent.parameters.options.systemMessage = before + instruction;
// Required to validate full positions against actual, per-product tool observations.
candidateAgent.parameters.options.returnIntermediateSteps = true;
const queryCode = readFileSync(path.join(root, "workflow/pcram-nomenclator-query.mjs"), "utf8").replace("export function", "function");
const toolCode = `const index = ${JSON.stringify(index)};\n${queryCode}\nreturn JSON.stringify(queryNomenclator(index, query));\n`;
const schema = { type: "object", additionalProperties: false, properties: {
  indice: { type: "integer", minimum: 1, maximum: 100 },
  prefijo: { type: "string", maxLength: 15, description: "Vacío, HS4/6, NCM8 o SIM completo; no completar códigos" },
  texto: { type: "string", maxLength: 160, description: "Hasta ocho términos literales, de al menos tres caracteres; no marca ni tasa" },
  limite: { type: "integer", minimum: 1, maximum: 8 },
}, required: ["indice", "prefijo", "texto", "limite"] };
candidate.nodes.push({
  id: "0944bbbe-5bc2-4e8c-a8f5-67aeed667023", name: "Consulta_nomenclador_PCRAM",
  type: "@n8n/n8n-nodes-langchain.toolCode", typeVersion: 1.3, position: [1280, 448],
  parameters: { language: "javaScript", description: "Consulta léxica de sólo lectura al snapshot PCRAM por prefijo/texto. Devuelve posiciones reales, contexto y límites; no impuestos ni garantía de clasificación. Usar indice del producto; nunca inferir atributos o tasa desde existencia de código.",
    jsCode: toolCode, specifyInputSchema: true, schemaType: "manual", inputSchema: JSON.stringify(schema) },
});
candidate.connections.Consulta_nomenclador_PCRAM = { ai_tool: [[{ node: "Agente Despachante", type: "ai_tool", index: 0 }]] };
const validator = node(candidate, "Validar salida del agente");
const beforeValidator = validator.parameters.jsCode;
const anchor = "productos:ordered";
if (beforeValidator.split(anchor).length !== 2) throw new Error("Validator anchor mismatch");
const guardCode = readFileSync(path.join(root, "workflow/pcram-classification-guard.mjs"), "utf8").replace("export function", "function");
validator.parameters.jsCode = guardCode + "\n" + beforeValidator.replace(anchor,
  `productos:guardClassification(ordered,raw.intermediateSteps,${JSON.stringify(index.metadata.zip_sha256)})`);
mkdirSync(dir, { recursive: true });
writeFileSync(path.join(dir, "candidate.workflow.json"), JSON.stringify(candidate, null, 2) + "\n");
writeFileSync(path.join(dir, "prompt.before.txt"), before);
writeFileSync(path.join(dir, "prompt.after.txt"), candidateAgent.parameters.options.systemMessage);
writeFileSync(path.join(dir, "validator.before.js"), beforeValidator);
writeFileSync(path.join(dir, "validator.after.js"), validator.parameters.jsCode);
const summary = {
  status: "PREPARED; NOT DEPLOYED", baseline_version: baseline.versionId, node_count: 12,
  index_file: path.relative(root, indexPath), index_sha256: hash(indexBytes), source: index.metadata,
  prompt_before_sha256: hash(before), prompt_candidate_sha256: hash(candidateAgent.parameters.options.systemMessage),
  tool_sha256: hash(toolCode), validator_before_sha256: hash(beforeValidator), validator_candidate_sha256: hash(validator.parameters.jsCode),
  model_unchanged_sha256: hash(JSON.stringify(node(baseline, "OpenAI Chat Model"))),
  calculator_unchanged_sha256: hash(node(baseline, "Cotizador deterministico").parameters.jsCode),
  candidate_file_sha256: hash(readFileSync(path.join(dir, "candidate.workflow.json"))),
  byte_sizes: { index: indexBytes.length, tool: Buffer.byteLength(toolCode), candidate: Buffer.byteLength(JSON.stringify(candidate)) },
  changes: ["/nodes/4/parameters/options/systemMessage", "/nodes/4/parameters/options/returnIntermediateSteps", "/nodes/7/parameters/jsCode", "/nodes/11 (one Code Tool)", "/connections/Consulta_nomenclador_PCRAM (ai_tool only)"],
  rollback: { remove_node_id: candidate.nodes[11].id, remove_connection_key: "Consulta_nomenclador_PCRAM", restore_prompt: "prompt.before.txt", restore_returnIntermediateSteps: false, restore_validator: "validator.before.js", never_import_full_workflow: true },
};
writeFileSync(path.join(dir, "candidate.receipt.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary));
