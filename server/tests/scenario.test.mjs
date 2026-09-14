import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,readdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {equipment,documents,telemetry,alerts} from '../seed/index.mjs';
import {seedState} from '../domain/reports.mjs';
import {AS_OF} from '../seed/scenario.mjs';
import {openStore} from '../storage.mjs';
test('scenario references, budgets, chronology and stable sensor data agree',()=>{
  const state=seedState();
  assert.equal(documents.length,39);assert.equal(state.reports.length,18);
  assert.equal(new Set(documents.map(d=>d.id)).size,39);
  assert.equal(new Set(state.reports.map(r=>r.collection)).size,5);
  for(const e of equipment){
    const series=telemetry(e.id);assert.equal(series.length,435);
    assert.deepEqual(series,telemetry(e.id));
    assert.equal(new Set(series.map(p=>p.field)).size,3);
    assert.equal(Date.parse(series.at(-1).time),Date.parse(AS_OF));
    assert.equal(alerts(e.id).length,e.status==='active'?0:1);
    assert.equal(documents.filter(d=>d.equipmentId===e.id).length,5);
  }
  for(const r of state.reports){
    assert.ok(equipment.some(e=>e.id===r.equipmentId));
    assert.equal(r.costItems.reduce((s,c)=>s+c.amountCents,0),r.amountCents);
    assert.ok(r.sections.length>=2);
    for(const id of r.evidenceIds){
      const d=documents.find(d=>d.id===id);assert.ok(d,id);
      assert.ok(!d.equipmentId||d.equipmentId===r.equipmentId);
      assert.ok(d.date<=r.createdAt.slice(0,10));
      assert.equal(r.evidenceSnapshot.find(s=>s.id===id).body,d.body);
    }
    for(const id of [r.sourceId,r.parentReportId].filter(Boolean)){
      const source=state.reports.find(p=>p.id===id);assert.ok(source);
      assert.equal(source.equipmentId,r.equipmentId);
      assert.ok(Date.parse(source.createdAt)<=Date.parse(r.createdAt));
    }
  }
});
test('upgrade backs up and preserves user records and empty reset survives restart',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'gotham-scenario-')),file=path.join(dir,'state.json');
  const original={schema:1,reports:[{id:'USER-report',version:3,title:'Saved report'}],customers:[{id:'yulong',category:'大客户'}],requests:{'saved-request':{result:42}}};
  await writeFile(file,JSON.stringify(original));
  let store=await openStore(file);
  assert.deepEqual(store.read().reports[0],original.reports[0]);
  assert.deepEqual(store.read().customers,original.customers);
  assert.deepEqual(store.read().requests,original.requests);
  assert.equal(store.read().reports.length,19);
  const backup=(await readdir(dir)).find(f=>f.endsWith('.bak'));
  assert.deepEqual(JSON.parse(await readFile(path.join(dir,backup),'utf8')),original);
  store=await openStore(file);assert.equal(store.read().reports.length,19);
  await store.mutate(s=>Object.assign(s,seedState('empty')));
  store=await openStore(file);assert.equal(store.read().reports.length,0);
});
