function parseAgent(raw,s){
  const fail=()=>({siguiente:'responder',respuesta:{solicitud_id:s.solicitud.solicitud_id,status:'error',codigo:'RESPUESTA_IA_INVALIDA',mensaje:'No pudimos procesar la respuesta del estimador. Tus datos se conservan para volver a intentar.'}});
  if(!raw||raw.error||raw.refusal||!Object.hasOwn(raw,'output'))return fail();
  let a=raw.output;
  if(typeof a==='string'){try{a=JSON.parse(a);}catch{return fail();}}
  if(!a||!Array.isArray(a.productos)||a.productos.length!==s.solicitud.productos.length)return fail();
  const ordered=[...a.productos].sort((a,b)=>a.indice-b.indice);
  if(ordered.some((p,i)=>!p||p.indice!==i+1||typeof p.producto!=='string'||!p.producto.trim()||typeof p.DIE!=='number'||!Number.isFinite(p.DIE)||p.DIE<0||p.DIE>100))return fail();
  return {solicitud:s.solicitud,siguiente:'cotizar',productos:ordered};
}
return [{json:parseAgent($input.first().json,$('Preparar agente').first().json)}];