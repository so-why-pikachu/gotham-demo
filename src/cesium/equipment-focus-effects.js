// World-space selection graphics. Nothing here represents a measured safety zone.
export function createEquipmentFocusEffects(viewer) {
  const C = globalThis.Cesium;
  let generation = 0, entities = [], layers = [], routes = [];
  let stopWave;
  function clear() {
    generation++;
    stopWave?.(); stopWave = undefined;
    entities.forEach(e => viewer.entities.remove(e)); entities = [];
    layers.forEach(([l,b,s,c]) => {l.brightness=b;l.saturation=s;l.contrast=c;}); layers=[];
    routes.forEach(([p,m,w]) => {p.material=m;p.width=w;}); routes=[];
  }
  async function show(position, model, routeId) {
    clear(); const token = generation;
    for(let i=0;i<viewer.imageryLayers.length;i++) {
      const l=viewer.imageryLayers.get(i);layers.push([l,l.brightness,l.saturation,l.contrast]);
      l.saturation=.06;l.brightness=.58;l.contrast=1.15;
    }
    viewer.entities.values.filter(e=>e.id.endsWith('-route')&&e.polyline).forEach(e=>{
      routes.push([e.polyline,e.polyline.material,e.polyline.width]);
      e.polyline.material=new C.PolylineDashMaterialProperty({color:C.Color.fromCssColorString(e.id===`${routeId}-route`?'#9dc2b6':'#738080').withAlpha(.35),gapColor:C.Color.TRANSPARENT,dashLength:24,dashPattern:255});e.polyline.width=4;
    });
    const radius=model.startsWith('XDE')?27:20;
    const matrix=C.Transforms.eastNorthUpToFixedFrame(position);
    const local=(x,y)=>C.Cartographic.fromCartesian(C.Matrix4.multiplyByPoint(matrix,new C.Cartesian3(x,y,0),new C.Cartesian3()));
    const samples=[];
    for(const ratio of [.58,1,1.42])for(let i=0;i<=96;i++){
      const a=i/96*Math.PI*2, wobble=ratio>1?1+.045*Math.sin(a*5)+.025*Math.cos(a*9):1;
      samples.push(local(Math.cos(a)*radius*ratio*wobble,Math.sin(a)*radius*ratio*wobble));
    }
    for(let x=-radius*1.3;x<radius*1.3;x+=3.5)for(let y=-radius*1.3;y<radius*1.3;y+=3.5)if(Math.hypot(x,y)>radius&&Math.hypot(x,y)<radius*1.35)samples.push(local(x,y));
    try {await C.sampleTerrainMostDetailed(viewer.terrainProvider,samples);} catch { /* use available globe heights */ }
    if(token!==generation||viewer.isDestroyed())return;
    samples.forEach(p=>{if(!Number.isFinite(p.height))p.height=viewer.scene.globe.getHeight(p)??C.Cartographic.fromCartesian(position).height;});
    const point=(p,up=0)=>C.Cartesian3.fromRadians(p.longitude,p.latitude,p.height+.35+up);
    const add=spec=>{const e=viewer.entities.add(spec);entities.push(e);return e;};
    for(let j=0;j<3;j++){
      const ring=samples.slice(j*97,(j+1)*97);
      add({polyline:{positions:ring.map(p=>point(p)),width:j===1?2:1,material:C.Color.fromCssColorString(j===2?'#c3d1d3':'#94f98b').withAlpha(j===2?.4:.85)}});
      if(j===1){
        const baseHeights=ring.map(p=>p.height+7);
        const wall=add({wall:{positions:ring.map(p=>point(p)),minimumHeights:ring.map(p=>p.height+.35),maximumHeights:baseHeights,material:C.Color.fromCssColorString('#69f481').withAlpha(.24)}});
        const rim=add({polyline:{positions:ring.map(p=>point(p,6.65)),width:2,material:C.Color.fromCssColorString('#b8ffa0').withAlpha(.85)}});
        // Use wall-clock time: the effect also works after the vehicle clock stops.
        let strength=0, elapsed=0, last=performance.now(), dynamic=false;
        const heights=[...baseHeights], positions=ring.map(p=>point(p,6.65));
        const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
        const removeFrame=viewer.scene.preUpdate.addEventListener(()=>{
          const now=performance.now(), dt=Math.min((now-last)/1000,.1);last=now;
          const target=reduced?.matches?0:1;
          strength+=(target-strength)*(1-Math.exp(-dt*7));
          if(!target&&strength<.002){
            strength=0;
            if(dynamic){wall.wall.maximumHeights=[...baseHeights];rim.polyline.positions=ring.map(p=>point(p,6.65));dynamic=false;elapsed=0;}
            return;
          }
          if(!dynamic){
            wall.wall.maximumHeights=new C.CallbackProperty(()=>[...heights],false);
            rim.polyline.positions=new C.CallbackProperty(()=>positions.map(p=>C.Cartesian3.clone(p)),false);
            dynamic=true;
          }
          elapsed+=dt;
          ring.forEach((p,i)=>{
            const angle=i/(ring.length-1)*Math.PI*2;
            const wave=strength*(2.8*Math.sin(angle*4-elapsed*2.6)+.9*Math.sin(angle*7+elapsed*1.8));
            heights[i]=baseHeights[i]+wave;
            C.Cartesian3.fromRadians(p.longitude,p.latitude,heights[i],C.Ellipsoid.WGS84,positions[i]);
          });
        });
        stopWave=removeFrame;
      }
    }
    samples.slice(291).forEach(p=>add({position:point(p,.15),point:{pixelSize:2,color:C.Color.fromCssColorString('#dbf8df').withAlpha(.42)}}));
  }
  return {show,clear,destroy:clear};
}
