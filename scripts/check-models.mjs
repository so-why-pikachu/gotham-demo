import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const output=await mkdtemp(path.join(os.tmpdir(),'gotham-model-check-'));
const config=JSON.parse(await readFile(new URL('../public/models/equipment-inspection.json',import.meta.url),'utf8'));
for(const model of Object.values(config.models)){
  const b=await readFile(new URL('../public'+model.uri,import.meta.url));const g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));
  const names=g.nodes.filter(n=>n.mesh!==undefined).map(n=>n.name);
  assert.deepEqual(new Set(Object.values(model.parts).flat()),new Set(names));
  assert.equal(Object.keys(model.views).length,4);
}
const pages=await fetch(`http://127.0.0.1:${process.env.CDP_PORT??9346}/json`).then(r=>r.json());
const ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map(),errors=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const until=async expression=>{for(let i=0;i<120;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,150));}throw Error('Timed out: '+expression);};
const click=async selector=>{
 const point=await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
 await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
 await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
};
try {
 await send('Page.enable');await send('Network.enable');await send('Runtime.enable');
 await send('Network.setBlockedURLs',{urls:['https://*']});
 await send('Emulation.setDeviceMetricsOverride',{width:1600,height:900,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:process.env.DEMO_URL??'http://127.0.0.1:5180/'});
 await until(`!!document.querySelector('[aria-label="打开Operations"]')`);await click('[aria-label="打开Operations"]');
 await until(`document.querySelectorAll('.mine-sidebar .object-row').length===6`);
 for(const [index,name] of ['XDE240','XE215C','XC958U'].entries()){
   await click(`.mine-sidebar .object-row:nth-child(${index*2+1})`);
   await until(`document.querySelector('.equipment-model-viewer h3')?.textContent.includes('${name}') && !document.querySelector('.equipment-model-status') && document.querySelectorAll('.equipment-part-list button').length>2`);
   await until(`Number(document.querySelector('.equipment-model-host').dataset.renderedTriangles)>100`);
   await new Promise(r=>setTimeout(r,400));
   let shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(output,name+'.png'),Buffer.from(shot.data,'base64'));
   await click('.equipment-part-list button:nth-child(2)');
   await until(`document.querySelector('.equipment-part-list button:nth-child(2)').getAttribute('aria-pressed')==='true'`);
   await new Promise(r=>setTimeout(r,200));
   shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(output,name+'-local.png'),Buffer.from(shot.data,'base64'));
   assert.equal(await evaluate(`document.querySelectorAll('.equipment-model-toolbar button').length`),3);
   await click('.equipment-model-toolbar button:nth-child(2)');
   await until(`document.querySelector('.equipment-model-toolbar button:nth-child(2)').getAttribute('aria-pressed')==='true'`);
   await click('.equipment-model-toolbar button:nth-child(3)');
   await click('.equipment-model-toolbar button:first-child');
   await click('.equipment-part-list button:nth-child(2)');
   await until(`![...document.querySelectorAll('.equipment-part-list button')].some(b=>b.getAttribute('aria-pressed')==='true')`);
 }
 assert.deepEqual(errors,[]);console.log('PASS: Blender metadata covers every GLB mesh; all three models render, local selection/deselection, solid, transparency, wireframe and switching.');console.log(output);
}finally{await send('Browser.close').catch(()=>{});ws.close();}
