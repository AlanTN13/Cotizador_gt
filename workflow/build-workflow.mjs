import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {validateInput,agentSchema,agentInstructions,prepareAgent,parseAgent,calculate} from './workflow-source.mjs';
const target=new URL('./GlobalTrip-Courier-V1.n8n.json',import.meta.url);
const previous=fs.existsSync(target)?JSON.parse(fs.readFileSync(target)):{};
const old=Object.fromEntries((previous.nodes||[]).map(n=>[n.name,n]));
const nodes=[],connections={};
const add=(name,type,version,parameters,position,extra={})=>nodes.push({id:old[name]?.id||randomUUID(),name,type:type.startsWith('@n8n/')?type:`n8n-nodes-base.${type}`,typeVersion:version,parameters,position,...extra});
const code=(name,source,x,y=0)=>add(name,'code',2,{mode:'runOnceForAllItems',jsCode:source},[x,y]);
const gate=(name,x,condition)=>add(name,'if',2.2,{conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict',version:2},conditions:[{id:randomUUID(),leftValue:condition,rightValue:true,operator:{type:'boolean',operation:'true',singleValue:true}}],combinator:'and'},options:{}},[x,0]);
const wire=(from,to,branch=0)=>{connections[from]??={main:[]};while(connections[from].main.length<=branch)connections[from].main.push([]);connections[from].main[branch].push({node:to,type:'main',index:0});};
add('Formulario - POST','webhook',2,{httpMethod:'POST',path:'globaltrip-courier-v1',authentication:'headerAuth',responseMode:'responseNode',options:{}},[0,0],{webhookId:old['Formulario - POST']?.webhookId||randomUUID(),notesInFlow:true,notes:'Conservar la credencial Header Auth del webhook en n8n y en el backend existente de la landing. La clave OpenAI se guarda únicamente como credencial del nodo OpenAI Chat Model. Conexión server-side de preview.'});
code('Validar formulario',`${validateInput.toString()}\nreturn [{json:validateInput($input.first().json.body,$execution.id)}];`,240);
gate('Entrada completa',480,'={{ $json.siguiente === "agente" }}');
code('Preparar agente',`${prepareAgent.toString()}\nreturn [{json:prepareAgent($input.first().json)}];`,720);
add('Agente Despachante','@n8n/n8n-nodes-langchain.agent',3.1,{
  promptType:'define',text:'={{ $json.agent_input }}',hasOutputParser:true,
  options:{systemMessage:agentInstructions,maxIterations:8,returnIntermediateSteps:false,enableStreaming:false,passthroughBinaryImages:false,autoSaveHighlightedData:false}
},[960,0],{onError:'continueRegularOutput',notesInFlow:true,notes:'AI Agent nativo. Usa OpenAI Chat Model y su Web Search integrada para consultar el link y buscar fuentes; entrega al parser el mismo contrato funcional.'});
add('OpenAI Chat Model','@n8n/n8n-nodes-langchain.lmChatOpenAi',1.3,{
  model:{__rl:true,mode:'id',value:'gpt-5-mini'},responsesApiEnabled:true,
  builtInTools:{webSearch:{searchContextSize:'medium'}},
  options:{maxTokens:7000,timeout:100000,reasoningEffort:'low',maxRetries:0,extraBody:JSON.stringify({store:false,include:['web_search_call.action.sources']})}
},[840,280],{notesInFlow:true,notes:'Joaco: seleccionar aquí la credencial OpenAI de n8n. Mantener Use Responses API activado y Built-in Tools → Web Search. La herramienta permite búsqueda y apertura de páginas en este modelo. No se requiere otro proveedor ni otra API key.'});
add('Salida estructurada','@n8n/n8n-nodes-langchain.outputParserStructured',1.3,{
  schemaType:'manual',inputSchema:JSON.stringify(agentSchema,null,2),autoFix:false
},[1110,280],{notesInFlow:true,notes:'Contrato JSON del despachante, sin ejemplos ni respuestas precargadas. El Code Node posterior valida solo el formato técnico antes de calcular.'});
connections['OpenAI Chat Model']={ai_languageModel:[[{node:'Agente Despachante',type:'ai_languageModel',index:0}]]};
connections['Salida estructurada']={ai_outputParser:[[{node:'Agente Despachante',type:'ai_outputParser',index:0}]]};
code('Validar salida del agente',`${parseAgent.toString()}\nreturn [{json:parseAgent($input.first().json,$('Preparar agente').first().json)}];`,1200);
gate('Clasificado y apto',1440,'={{ $json.siguiente === "cotizar" }}');
code('Cotizador deterministico',`${calculate.toString()}\nreturn [{json:calculate($input.first().json)}];`,1680);
add('Responder a la landing','respondToWebhook',1.4,{respondWith:'json',responseBody:'={{ $json.respuesta }}',options:{responseCode:200,responseHeaders:{entries:[{name:'Cache-Control',value:'no-store'}]}}},[1930,200]);
wire('Formulario - POST','Validar formulario');wire('Validar formulario','Entrada completa');wire('Entrada completa','Preparar agente');wire('Entrada completa','Responder a la landing',1);wire('Preparar agente','Agente Despachante');wire('Agente Despachante','Validar salida del agente');wire('Validar salida del agente','Clasificado y apto');wire('Clasificado y apto','Cotizador deterministico');wire('Clasificado y apto','Responder a la landing',1);wire('Cotizador deterministico','Responder a la landing');
const workflow={name:'GlobalTrip - Courier aereo V1 - PREVIEW',nodes,connections,active:false,pinData:{},settings:{executionOrder:'v1',executionTimeout:115,saveDataErrorExecution:'all',saveDataSuccessExecution:'all',saveManualExecutions:true,saveExecutionProgress:false},versionId:randomUUID(),tags:[]};
fs.writeFileSync(target,JSON.stringify(workflow,null,2)+'\n');
fs.writeFileSync(new URL('./Agente-Despachante.txt',import.meta.url),agentInstructions+'\n');
console.log('GlobalTrip V1: JSON y prompt generados desde workflow-source.mjs');
