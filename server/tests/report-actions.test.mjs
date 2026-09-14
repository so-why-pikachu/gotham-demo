import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isDemandReport} from '../../shared/report-actions.mjs';
import {route} from '../routes.mjs';
test('only demand reports may be pushed; follow-ups and legacy sent reports cannot',async()=>{
  for(const report of [
    {type:'business',collection:'follow-up',sent:false},
    {type:'business',collection:'archive'},
    {type:'business',sent:true},
    {type:'diagnosis',collection:'demand'},
  ]) assert.equal(isDemandReport(report),false);
  assert.equal(isDemandReport({type:'business',sent:false}),true);
  const state={reports:[{id:'D',type:'business',collection:'demand',version:1,sent:false},{id:'F',type:'business',collection:'follow-up',version:1,sent:false}],requests:{}};
  const store={read:()=>structuredClone(state),mutate:fn=>fn(state)};
  await assert.rejects(route(store,'POST',new URL('http://local/api/v1/business-reports/F/push'),{version:1,requestId:'follow'}),e=>e.status===409);
  assert.equal(state.reports[1].sent,false);
  const url=new URL('http://local/api/v1/business-reports/D/push'),body={version:1,requestId:'demand'};
  const result=await route(store,'POST',url,body);
  assert.equal(result.sent,true);assert.equal(isDemandReport(result),false);
  assert.deepEqual(await route(store,'POST',url,body),result);
});
