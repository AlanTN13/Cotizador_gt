// Integrity only: ASCII SIM sets / tax rows. No rates or nomenclator are duplicated.
export function sha256Ascii(text) {
  if (/[^\x00-\x7f]/.test(text)) throw Error('Expected ASCII integrity input');
  const k = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const bytes = new Uint8Array(Math.ceil((text.length + 9) / 64) * 64);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
  bytes[text.length] = 128;
  const view = new DataView(bytes.buffer), bits = text.length * 8;
  view.setUint32(bytes.length - 8, Math.floor(bits / 4294967296));
  view.setUint32(bytes.length - 4, bits >>> 0);
  const h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const rotate = (x, n) => (x >>> n) | (x << (32 - n)), w = new Uint32Array(64);
  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const x = w[i - 15], y = w[i - 2];
      w[i] = w[i - 16] + (rotate(x,7) ^ rotate(x,18) ^ (x >>> 3)) + w[i - 7] + (rotate(y,17) ^ rotate(y,19) ^ (y >>> 10));
    }
    let [a,b,c,d,e,f,g,z] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (z + (rotate(e,6) ^ rotate(e,11) ^ rotate(e,25)) + ((e & f) ^ (~e & g)) + k[i] + w[i]) | 0;
      const t2 = ((rotate(a,2) ^ rotate(a,13) ^ rotate(a,22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      [a,b,c,d,e,f,g,z] = [(t1+t2)|0,a,b,c,(d+t1)|0,e,f,g];
    }
    for (const [i,v] of [a,b,c,d,e,f,g,z].entries()) h[i] = (h[i] + v) | 0;
  }
  return h.map(v => (v >>> 0).toString(16).padStart(8,'0')).join('');
}

export function estimateFamilyDuty(hs, product, now, duty, proof, steps) {
  try {
  // A family never repairs an invalid/full identifier or an unsupported product.
  if (!/^(?:\d{4}|\d{6})$/.test(hs || '') || product.SIM || !duty || !proof) return null;
  if (proof.schema !== 'pcram-family-coverage-sha256-v1' || !proof.families?.[hs] ||
      duty.version !== proof.taxVersion || JSON.stringify(duty.source) !== JSON.stringify(proof.taxSource) ||
      !/^[a-f0-9]{64}$/.test(duty.source?.sha256 || '') ||
      !/^[a-f0-9]{64}$/.test(proof.classification?.zip_sha256 || '') ||
      !/^[a-f0-9]{64}$/.test(proof.classification?.ncm_sha256 || '') ||
      proof.classification.tax_snapshot_sha256 !== duty.source.sha256 ||
      !Number.isFinite(+now) || !Number.isFinite(Date.parse(duty.source.capturedAt)) ||
      !Number.isFinite(Date.parse(duty.source.reviewAfter)) ||
      +now < Date.parse(duty.source.capturedAt) || +now >= Date.parse(duty.source.reviewAfter) ||
      !Number.isFinite(Date.parse(proof.classificationUpdatedAt)) ||
      +now < Date.parse(proof.classificationUpdatedAt)) return null;
  // Existing real tool trace substantiates the family, not the rate or product SIM.
  const supported = (Array.isArray(steps) ? steps : []).some(step => {
    if (step?.action?.tool !== 'Consulta_nomenclador_PCRAM' || typeof step.observation !== 'string') return false;
    let response;
    try {
      response = JSON.parse(step.observation);
      if (Array.isArray(response)) {
        if (response.length !== 1 || !response[0] || Array.isArray(response[0]) ||
            Object.keys(response[0]).length !== 1 || typeof response[0].response !== 'string') return false;
        response = JSON.parse(response[0].response);
      }
    } catch { return false; }
    const q = response?.query, input = step.action.toolInput;
    if (!response || Array.isArray(response) || response.error || response.errors || response.response ||
        response.status !== 'OK' || q?.indice !== product.indice || input?.indice !== product.indice ||
        !['prefijo','texto','limite'].every(k => input?.[k] === q?.[k]) ||
        !Number.isInteger(q.limite) || q.limite < 1 || q.limite > 8 ||
        typeof q.prefijo !== 'string' || typeof q.texto !== 'string' ||
        response.source?.zip_sha256 !== proof.classification.zip_sha256 ||
        response.source?.ncm_sha256 !== proof.classification.ncm_sha256 ||
        response.source?.tax_snapshot_sha256 !== duty.source.sha256 ||
        response.source?.schema !== proof.classification.schema ||
        response.source?.record_count !== proof.classification.record_count ||
        !Array.isArray(response.results) || !response.results.length ||
        response.returned_count !== response.results.length || !Number.isInteger(response.matched_count) ||
        response.matched_count < response.returned_count ||
        response.partial !== (response.matched_count > response.returned_count)) return false;
    return response.results.some(row => /^\d{11}[A-Z]$/.test(row?.sim || '') &&
      row.sim.startsWith(hs) && Object.hasOwn(duty.rows || {},row.sim) && row.ncm === row.sim.slice(0,8) &&
      row.source_uri === `pcram://${proof.classification.zip_sha256}/sim/${row.sim}`);
  });
  if (!supported) return null;
  // Sort tax codes once per calculator execution, then use binary prefix bounds.
  if (!proof._taxCodes) proof._taxCodes = Object.keys(duty.rows).sort();
  const codes = proof._taxCodes;
  if (codes.length !== duty.rowCount) return null;
  const bound = value => { let lo=0,hi=codes.length; while(lo<hi){const m=(lo+hi)>>>1;if(codes[m]<value)lo=m+1;else hi=m;}return lo; };
  const family = codes.slice(bound(hs),bound(hs+':'));
  const [count, codeHash, rowHash] = proof.families[hs];
  if (!family.length || family.length !== count || sha256Ascii(JSON.stringify(family)) !== codeHash) return null;
  const rows = family.map(sim => [sim,duty.rows[sim].duty,duty.rows[sim].statistical,duty.rows[sim].updatedAt]);
  if (sha256Ascii(JSON.stringify(rows)) !== rowHash || rows.some(row =>
      typeof row[1] !== 'number' || !Number.isFinite(row[1]) || row[1] < 0 || row[1] > 1 || row[1] !== rows[0][1])) return null;
  return { rate: rows[0][1],
    source: `${duty.version}:HS${hs.length}:${hs}:taxZIP=${duty.source.sha256}:classificationZIP=${proof.classification.zip_sha256}`,
    basis: `Estimación DIE por familia HS${hs.length} ${hs}: cobertura íntegra ${count}/${count}, DIE extrazona uniforme en snapshot; SIM conjunto SHA-256 ${codeHash}. No certifica SIM del producto ni vigencia legal. Captura tributaria ${duty.source.capturedAt}; índice ${proof.classificationUpdatedAt}.` };
  } catch { return null; } // A corrupt/incomplete family proof never disables the old estimate.
}
