// Adapt existing agent output; the agent, its schema and external contract stay intact.
export function resolveProductTaxes(product, index, now, resolver, policy) {
  const {resolveTaxes, normalizePosition, TAX_RESOLVER_VERSION, TAX_SCOPE} = resolver;
  const ncm = normalizePosition(typeof product.clasificacion === 'string' ? product.clasificacion : null);
  const sim = normalizePosition(typeof product.SIM === 'string' ? product.SIM : null);
  const position = sim || ncm;
  const partial = typeof product.clasificacion === 'string' ? product.clasificacion.trim().replace(/[.\s]/g,'') : '';
  const hs = /^\d{4}(?:\d{2})?$/.test(partial) ? partial : null;
  const source = {version:'n8n-agent-contract-2026-09-15', index:product.indice,
    producto:product.producto, clasificacion:product.clasificacion ?? null, SIM:product.SIM ?? null,
    DIE:product.DIE, fundamento:typeof product.fundamento === 'string' ? product.fundamento : '',
    evidencia:Array.isArray(product.evidencia) ? product.evidencia : []};
  const review = reason => ({productIndex:index,status:'REQUIERE_REVISION',requestedPosition:position,
    ncm:position?.slice(0,8) ?? null,sim:sim?.length===12 ? sim : null,
    resolverVersion:TAX_RESOLVER_VERSION,scope:TAX_SCOPE,
    rates:{duty:null,statistical:null,vat:null},reasons:[reason],warnings:[],
    excludedConcepts:['IVA_ADICIONAL_PERCEPCION','GANANCIAS','IMPUESTOS_INTERNOS'],
    estimation:{policyVersion:policy.version,components:[]},dutyEvidence:null,vatEvidence:null,agentEvidence:source});
  if (!product.producto?.trim() || /^(?:producto\s+)?(?:no identificado|desconocido|sin identificar|unknown|indeterminado)$/i.test(product.producto.trim()))
    return review('PRODUCT_NOT_IDENTIFIED');
  if (sim && hs && !sim.startsWith(hs)) return review('POSITION_CONTRADICTION');
  if (sim && ncm && (sim.slice(0,8) !== ncm.slice(0,8) || (sim.length===12 && ncm.length===12 && sim!==ncm)))
    return review('POSITION_CONTRADICTION');
  // Honor an explicit upstream impediment if supplied, without introducing a
  // new eligibility classifier or treating ordinary uncertainty as rejection.
  if (product.aptitud_courier === 'no_apto' || product.aptitud_courier === 'no_apto_courier' || product.impedimento_courier === true)
    return review('COURIER_IMPEDIMENT');
  if (typeof product.DIE !== 'number' || !Number.isFinite(product.DIE) || product.DIE<0 || product.DIE>100)
    return review('NO_MINIMUM_TAX_BASIS');
  if (position) {
    const result=resolveTaxes(position,index,now,undefined,{position,duty:product.DIE/100,
      profileId:`agent-product-${product.indice}`,catalogVersion:source.version});
    // This fallback comes from the existing model estimate, not an approved catalog profile.
    result.warnings=result.warnings.map(w=>w==='PROFILE_DUTY_ESTIMATE'?'AGENT_DUTY_ESTIMATE':w);
    result.estimation.components=result.estimation.components.map(c=>c.tax==='duty' && c.method==='PROFILE_RATE'
      ? {...c,method:'AGENT_ESTIMATE',basis:'DIE estimado por el agente existente para la posición probable; sin coincidencia en snapshot.'}:c);
    if ((product.SIM && !sim) || (product.clasificacion && !ncm)) {
      result.warnings.push('PARTIAL_POSITION_USED');
      if(result.status==='RESUELTO') result.status='ESTIMADO';
    }
    return {...result,agentEvidence:source};
  }
  // The production agent may identify a product reasonably without a complete
  // NCM/SIM. Keep that existing capability; never invent a position or a DIE.
  const te=policy.generalStatistical, vat=policy.generalVat;
  if(+now<Date.parse(te.validFrom) || +now>=Date.parse(te.validUntil) || +now<Date.parse(vat.validFrom))
    return review('GENERAL_RULE_OUTSIDE_LEGAL_PERIOD');
  const result=review('');
  return {...result,status:'ESTIMADO',reasons:[],rates:{duty:product.DIE/100,statistical:te.rate,vat:vat.rate},
    warnings:['POSITION_INCOMPLETE_AGENT_ESTIMATE','AGENT_DUTY_ESTIMATE','GENERAL_TE_ESTIMATE','GENERAL_VAT_ESTIMATE'],
    estimation:{policyVersion:policy.version,components:[
      {tax:'duty',method:'AGENT_ESTIMATE',source:`${source.version}:product-${product.indice}`,basis:'Producto identificado por el agente; DIE estimado individualmente, sin posición completa ni consulta específica al snapshot.'},
      {tax:'statistical',method:'GENERAL_RULE',source:te.source,basis:te.basis},
      {tax:'vat',method:'GENERAL_RULE',source:vat.source,basis:vat.basis}]}};
}
