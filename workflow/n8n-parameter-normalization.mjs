// n8n omits selected default parameters when exporting a saved workflow.
// Normalize only defaults verified against the live editor; keep all other drift visible.
export function canonicalParameters(name, source) {
  const p = structuredClone(source);
  if (['Validar formulario','Preparar agente','Validar salida del agente','Cotizador deterministico'].includes(name) && !Object.hasOwn(p,'mode'))
    p.mode='runOnceForAllItems';
  if (name==='OpenAI Chat Model' && !Object.hasOwn(p,'responsesApiEnabled'))
    p.responsesApiEnabled=true;
  if (name==='Salida estructurada' && !Object.hasOwn(p,'autoFix'))
    p.autoFix=false;
  const sorted=x=>Array.isArray(x)?x.map(sorted):x&&typeof x==='object'
    ?Object.fromEntries(Object.keys(x).sort().map(k=>[k,sorted(x[k])])):x;
  return sorted(p);
}
