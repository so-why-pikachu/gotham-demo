import assert from 'node:assert/strict';
import {createParkedEquipmentEffects} from '../src/cesium/parked-equipment-effects.js';
globalThis.Cesium={JulianDate:{secondsDifference:(a,b)=>a-b}};
let tick, selected, enabled=true, shown=0, cleared=0, visible=false;
const viewer={clock:{currentTime:0,onTick:{addEventListener:fn=>{tick=fn;return()=>tick=undefined;}}}};
const vehicle=id=>({id,name:id,timeline:{startTime:12,totalDurationSeconds:48},entity:{position:{getValue:()=>[1,2,3]}}});
selected=vehicle('excavator-01');
const gate=createParkedEquipmentEffects(viewer,{show(){shown++;},clear(){cleared++;}},()=>selected,()=>enabled,v=>visible=v);
for(const time of [0,12,25,59.99]){viewer.clock.currentTime=time;tick();assert.equal(shown,0);}
viewer.clock.currentTime=60;tick();assert.equal(shown,1);assert.equal(visible,true);
tick();tick();assert.equal(shown,1); // No geometry rebuild on every frame.
selected={...vehicle('truck-01'),timeline:{startTime:0,totalDurationSeconds:80}};tick();assert.equal(visible,false);assert.equal(cleared,1);
viewer.clock.currentTime=80;tick();assert.equal(shown,2);
viewer.clock.currentTime=20;tick();assert.equal(visible,false); // Replay restores ordinary imagery.
viewer.clock.currentTime=90;tick();enabled=false;tick();assert.equal(visible,false);
gate.destroy();assert.equal(tick,undefined);
console.log('PASS: waiting/driving/turning have no effects; arrival shows once; switching, replay, exit and cleanup restore normal mode.');
