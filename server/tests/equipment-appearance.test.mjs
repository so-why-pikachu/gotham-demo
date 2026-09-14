import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {MeshStandardMaterial} from 'three';
import {rememberAppearance,applyAppearance} from '../../src/components/equipment-appearance.mjs';
import {equipment,alerts} from '../seed/index.mjs';

test('faults stay red in every display/selection mode and recover original materials',()=>{
  const source=new MeshStandardMaterial({color:'#8293ab',emissive:'#102030',emissiveIntensity:.2,opacity:.6,transparent:true,depthWrite:false});
  const m=source.clone();rememberAppearance(m);
  for(const mode of ['实体','半透明','线框'])for(const selected of [false,true])for(const active of [false,true]){
    applyAppearance(m,mode,selected,active,true);
    assert.equal(m.color.getHexString(),'ee343e');
    assert.equal(m.opacity,1);
    assert.equal(m.wireframe,mode==='线框');
    assert.equal(source.color.getHexString(),'8293ab');
  }
  applyAppearance(m,'实体',false,false,false);
  assert.equal(m.color.getHexString(),source.color.getHexString());
  assert.equal(m.emissive.getHexString(),source.emissive.getHexString());
  assert.equal(m.emissiveIntensity,.2);
  assert.equal(m.opacity,.6);assert.equal(m.transparent,true);assert.equal(m.depthWrite,false);
  applyAppearance(m,'半透明',true,false,false);assert.equal(m.opacity,.14);
  m.dispose();source.dispose();
});
test('every seeded alert maps to real geometry in its own equipment model',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../../public/models/equipment-inspection.json',import.meta.url),'utf8'));
  for(const e of equipment){
    const model=manifest.models[e.model];
    const b=await readFile(new URL('../../public'+model.uri,import.meta.url));
    const gltf=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));
    const meshes=new Set(gltf.nodes.filter(n=>n.mesh!==undefined).map(n=>n.name));
    for(const alert of alerts(e.id)){
      assert.equal(alert.equipmentId,e.id);
      assert.equal(alert.visualization.scope,'region');
      const nodes=model.parts[alert.visualization.part];
      assert.ok(nodes?.length,`${e.id}: missing part`);
      for(const name of nodes)assert.ok(meshes.has(name),name);
    }
  }
});
