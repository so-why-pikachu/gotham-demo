import assert from 'node:assert/strict';
import {mkdtemp,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const output=await mkdtemp(path.join(os.tmpdir(),'gotham-scene-check-'));
const pages=await fetch(`http://127.0.0.1:${process.env.CDP_PORT??9345}/json`).then(r=>r.json());
const ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map();
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}};
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const until=async expression=>{for(let i=0;i<80;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,150));}throw Error('Timed out: '+expression);};
const click=async selector=>{
 const point=await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.scrollIntoView({block:'nearest'});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
 await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
 await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
};
try {
 await send('Page.enable');await send('Network.enable');
 // Verify panel behaviour independently of ion availability; camera has a separate test.
 await send('Network.setBlockedURLs',{urls:['https://*']});
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:process.env.DEMO_URL??'http://127.0.0.1:5180/'});
 await until(`!!document.querySelector('.scene-navigation select')`);
 assert.equal(await evaluate(`!!document.querySelector('.overview-drawer')`),false);
 await evaluate(`(()=>{const e=document.querySelector('.scene-navigation select');e.value='yulong-mine';e.dispatchEvent(new Event('change',{bubbles:true}))})()`);
 await until(`document.querySelector('.scene-metrics')?.textContent.includes('8 / 8')`);
 assert.equal(await evaluate(`!!document.querySelector('.scene-equipment-list')`),false);
 assert.equal(await evaluate(`document.querySelector('.tab-title').textContent`),'总览');
 await click('.scene-range button:nth-child(3)');
 await until(`document.querySelector('.scene-history')?.textContent.includes('7 个样本')`);
 await click('.mine-info-tab:nth-child(2)');
 await until(`document.querySelector('.ops-equipment')?.textContent.includes('XDE240')`);
 await click('.ops-model-group:nth-of-type(2) summary');
 await click('[data-equipment-id="excavator-01"]');
 await until(`document.querySelector('.equipment-info-panel')?.textContent.includes('滤清器压差')`);
 assert.equal(await evaluate(`!!document.querySelector('.global-overview')`),true);
 await click('.ops-model-group:nth-of-type(3) summary');
 await click('[data-equipment-id="loader-01"]');
 await until(`document.querySelector('.equipment-info-panel')?.textContent.includes('主泵压力')`);
 for(const width of [1920,1440,1280]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
   await new Promise(r=>setTimeout(r,180));
   const boxes=await evaluate(`(()=>{const a=document.querySelector('.mine-info-panel').getBoundingClientRect(),b=document.querySelector('.equipment-info-panel').getBoundingClientRect();return {gap:b.left-a.right,right:b.right,width:innerWidth,scroll:document.documentElement.scrollWidth}})()`);
   assert.ok(boxes.gap>=580,JSON.stringify(boxes));assert.ok(boxes.right<=width);assert.ok(boxes.scroll<=width);
 }
 const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(output,'scene-one.png'),Buffer.from(shot.data,'base64'));
 await click('[aria-label="关闭设备档案"]');assert.equal(await evaluate(`!!document.querySelector('.equipment-info-panel')`),false);
 await click('.mine-info-back');await until(`!document.querySelector('.mine-info-panel')`);
 await evaluate(`(()=>{const e=document.querySelector('.scene-navigation select');e.value='antaibao-mine';e.dispatchEvent(new Event('change',{bubbles:true}))})()`);
 await until(`document.querySelector('.scene-metrics')?.textContent.includes('设备与监测数据未接入')`);
 console.log('PASS: macro history, device switching without navigation, missing data, return to national, 1920/1440/1280 layout.');console.log(output);
}finally{await send('Browser.close').catch(()=>{});ws.close();}
