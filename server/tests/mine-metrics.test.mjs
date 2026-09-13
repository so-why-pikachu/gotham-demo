import {test} from 'node:test';
import assert from 'node:assert/strict';
import {route} from '../routes.mjs';
import {equipment,alerts} from '../seed/index.mjs';
test('Mine metrics: deterministic periods, missing coverage, truthful counts and validation',async()=>{
  const store={read:()=>({})};
  const get=p=>route(store,'GET',new URL('http://localhost/api/v1'+p));
  const current=await get('/mines/yulong-mine/metrics');
  assert.equal(current.groups[0].items[0][1],equipment.length);
  assert.equal(current.groups[2].items[2][1],equipment.flatMap(e=>alerts(e.id)).length);
  for(const [range,n] of [['24h',24],['7d',7]]) {
    const result=await get('/mines/yulong-mine/metrics?range='+range);
    assert.equal(result.series.length,n);
    assert.equal(result.series.at(-1).dust,current.series[0].dust);
    assert.deepEqual(result,await get('/mines/yulong-mine/metrics?range='+range));
    assert.ok(Date.parse(result.period.from)<Date.parse(result.period.to));
  }
  const missing=await get('/mines/antaibao-mine/metrics');
  assert.equal(missing.connected,false);assert.equal(missing.groups[0].items[0][1],null);
  await assert.rejects(get('/mines/unknown/metrics'),/矿区不存在/);
  await assert.rejects(get('/mines/yulong-mine/metrics?range=bad'),/时间范围无效/);
});
