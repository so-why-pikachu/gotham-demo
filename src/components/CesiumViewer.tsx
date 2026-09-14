import { useEffect, useRef, useState } from 'react';
import { createViewer } from '../cesium/viewer.js';
import { setChinaView } from '../cesium/camera.js';
import { MINE_LOCATIONS } from '../cesium/locations.js';
import { addMineMarkers, enableMineLabelHover } from '../cesium/marker.js';
import { initializeTruckRoute } from '../cesium/route/controller.js';
import { getTimelineState } from '../cesium/route/timeline.js';
import type { MotionReading } from './EquipmentCloseup/MotionGauges';
import { createParkedEquipmentEffects } from '../cesium/parked-equipment-effects.js';
import { createEquipmentFocusEffects } from '../cesium/equipment-focus-effects.js';
import { createSceneNavigation } from '../cesium/scene-navigation.js';

interface Props {onMotion?:(reading:MotionReading|null)=>void;onParked?:(parked:boolean)=>void;onPhase?:(phase:string)=>void;mineId:string|null;equipmentId:string|null;reset:number;focusRequest:number;onMine:(id:string|null)=>void;onEquipment:(id:string|null)=>void}
let preservedRouteSeconds=0;
export default function CesiumViewer(props:Props) {
  const host = useRef<HTMLDivElement>(null), credits=useRef<HTMLDivElement>(null);
  const current=useRef(props); current.current=props;
  const controls=useRef<{navigate:()=>void;select:()=>void;focus:()=>void}|null>(null);
  const [phase,setPhase]=useState('national'),[error,setError]=useState(''),[status,setStatus]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{
    let cancelled=false;
    let cleanup:(()=>void)|undefined;
    const initialize=()=>{
    const C=(globalThis as any).Cesium;
    if (!C) {setError('地图引擎未加载，请检查网络后刷新页面');return;}
    let viewer:any, navigation:ReturnType<typeof createSceneNavigation>|undefined;
    let removeMotion:(()=>void)|undefined;
    let disposed=false, route:any, click:any, hover:any, clearHover:(()=>void)|undefined;
    let activePhase='national', height=0;
    let pendingFocus=false;
    const pins:any[]=[];
    let parked:ReturnType<typeof createParkedEquipmentEffects>|undefined;
    let effects:ReturnType<typeof createEquipmentFocusEffects>|undefined;
    try {
      viewer=createViewer(credits.current);setChinaView(viewer);effects=createEquipmentFocusEffects(viewer);
      parked=createParkedEquipmentEffects(viewer,effects,()=>route?.fleet.find((v:any)=>v.id===current.current.equipmentId),()=>current.current.mineId==='yulong-mine'&&['focusing','equipment'].includes(activePhase),(value:boolean)=>current.current.onParked?.(value));
      let lastMotionKey='';
      removeMotion=viewer.clock.onTick.addEventListener(()=>{
        const v=route?.fleet.find((v:any)=>v.id===current.current.equipmentId);
        if(!v){if(lastMotionKey){lastMotionKey='';current.current.onMotion?.(null);}return;}
        const seconds=C.JulianDate.secondsDifference(viewer.clock.currentTime,v.timeline.startTime);
        const state=getTimelineState(v.timeline,seconds);
        const elapsed=Math.max(0,Math.min(seconds,v.timeline.totalDurationSeconds));
        const moving=seconds>=0&&seconds<v.timeline.totalDurationSeconds&&state.phase==='DRIVE';
        const reading={equipmentId:v.id,speed:moving?v.timeline.speedMetersPerSecond*3.6:0,distance:Math.round(state.distanceMeters),totalDistance:v.timeline.route.totalDistanceMeters,elapsed:Math.floor(elapsed),duration:v.timeline.totalDurationSeconds,state:seconds<0?'WAITING':seconds>=v.timeline.totalDurationSeconds?'PARKED':state.phase};
        const key=JSON.stringify(reading);if(key!==lastMotionKey){lastMotionKey=key;current.current.onMotion?.(reading);}
      });
      const markers=addMineMarkers(viewer,MINE_LOCATIONS);
      clearHover=enableMineLabelHover(viewer,markers);
      const visible=()=>{
        const show=current.current.mineId==='yulong-mine' && ['mine','focusing','equipment'].includes(activePhase);
        route?.visualization.setShow(show);
        route?.fleet.forEach((v:any)=>{v.entity.show=show;});
        pins.forEach(pin=>{pin.show=show;});
        markers.forEach((m:any)=>{m.show=!current.current.mineId || (m.id===current.current.mineId && m.id!=='yulong-mine');});
      };
      navigation=createSceneNavigation(viewer,(next:string)=>{if(disposed)return;activePhase=next;setPhase(next);current.current.onPhase?.(next);visible();if(next==='mine'&&pendingFocus)focus();});
      const focus=()=>{
        if(!current.current.equipmentId){pendingFocus=false;return;}
        if(!route || activePhase==='entering'){pendingFocus=true;return;}
        pendingFocus=false;
        const vehicle=route.fleet.find((v:any)=>v.id===current.current.equipmentId);
        const position=vehicle?.entity.position.getValue(viewer.clock.currentTime);
        if(position){navigation!.focusEquipment(position,vehicle.name);parked?.sync();select();}
      };
      const navigate=(preserveFocus=false)=>{
        if(!preserveFocus)pendingFocus=false;parked?.clear();effects?.clear();
        const mine=MINE_LOCATIONS.find(m=>m.id===current.current.mineId);
        if(mine?.id==='yulong-mine' && !route) {activePhase='entering';setPhase('entering');viewer.camera.cancelFlight();visible();return;}
        navigation!.navigate(mine, mine?.id==='yulong-mine'?height:viewer.scene.globe.getHeight(C.Cartographic.fromDegrees(mine?.longitude??0,mine?.latitude??0))??0);
      };
      const select=()=>{pins.forEach(pin=>{const selected=pin.properties.equipmentId.getValue()===current.current.equipmentId;pin.point.outlineWidth=current.current.equipmentId?0:2;pin.point.color= current.current.equipmentId?C.Color.TRANSPARENT:C.Color.fromCssColorString('#183247').withAlpha(.65);pin.label.show=selected;pin.label.showBackground=!!current.current.equipmentId;pin.label.backgroundColor=C.Color.fromCssColorString('#153328').withAlpha(.85);});};
      viewer.scene.canvas.addEventListener('pointerleave',select);
      controls.current={navigate,select,focus};
      click=new C.ScreenSpaceEventHandler(viewer.scene.canvas);
      click.setInputAction((event:any)=>{
        if(activePhase==='entering'||activePhase==='returning')return;
        const picked=viewer.scene.pick(event.position)?.id;
        const id=picked?.properties?.equipmentId?.getValue()??picked?.parent?.id??picked?.id;
        if(MINE_LOCATIONS.some(m=>m.id===id)){current.current.onMine(id);return;}
        if(['mine','focusing','equipment'].includes(activePhase) && route?.fleet.some((v:any)=>v.id===id)) current.current.onEquipment(id);
        else if(!current.current.equipmentId)current.current.onEquipment(null);
      },C.ScreenSpaceEventType.LEFT_CLICK);
      hover=new C.ScreenSpaceEventHandler(viewer.scene.canvas);
      hover.setInputAction((event:any)=>{
        const entity=viewer.scene.pick(event.endPosition)?.id;
        const id=entity?.properties?.equipmentId?.getValue()??entity?.id;
        pins.forEach(pin=>{pin.label.show=pin.properties.equipmentId.getValue()===id || pin.properties.equipmentId.getValue()===current.current.equipmentId;});
      },C.ScreenSpaceEventType.MOUSE_MOVE);
      setStatus('正在准备地形与设备路线…');
      initializeTruckRoute(viewer,()=>{}).then(result=>{
        if(disposed || !result)return;
        route=result;height=Math.max(...Object.values(result.routes).map((r:any)=>r.terrainHeightMax));
        const duration=C.JulianDate.secondsDifference(viewer.clock.stopTime,viewer.clock.startTime);
        viewer.clock.currentTime=C.JulianDate.addSeconds(viewer.clock.startTime,Math.min(preservedRouteSeconds,duration),new C.JulianDate());
        result.fleet.forEach((vehicle:any)=>{
          pins.push(viewer.entities.add({id:`pick-${vehicle.id}`,properties:{equipmentId:vehicle.id},position:vehicle.entity.position,availability:vehicle.entity.availability,
            point:{pixelSize:24,color:C.Color.fromCssColorString('#183247').withAlpha(.65),outlineColor:C.Color.fromCssColorString('#4a9eff'),outlineWidth:2,disableDepthTestDistance:Infinity},
            label:{text:vehicle.name,font:'12px MiSans',show:false,pixelOffset:new C.Cartesian2(0,-28),fillColor:C.Color.WHITE,disableDepthTestDistance:Infinity},show:false}));
        });
        visible();select();setStatus('');
        if(current.current.mineId==='yulong-mine'){pendingFocus=!!current.current.equipmentId;navigate(true);}
      }).catch(()=>{if(!disposed)setStatus('地形或设备路线加载失败，请检查网络后重试');});
      if(current.current.mineId)navigate();else visible();
      let timer:ReturnType<typeof setTimeout>;
      const resize=new ResizeObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{if(!disposed){if(current.current.equipmentId)focus();else navigate();}},250);});
      if(host.current)resize.observe(host.current);
      return ()=>{disposed=true;if(route)preservedRouteSeconds=C.JulianDate.secondsDifference(viewer.clock.currentTime,viewer.clock.startTime);clearTimeout(timer);resize.disconnect();controls.current=null;viewer.scene.canvas.removeEventListener('pointerleave',select);clearHover?.();click.destroy();hover.destroy();removeMotion?.();parked?.destroy();effects?.destroy();navigation?.destroy();viewer.destroy();};
    } catch(e) {setError((e as Error).message);clearHover?.();click?.destroy();hover?.destroy();removeMotion?.();parked?.destroy();effects?.destroy();navigation?.destroy();viewer?.destroy();}
    };
    // Cesium rasterizes labels: load their actual faces before creating them.
    Promise.all([
      document.fonts.load('400 12px MiSans'),
      document.fonts.load('600 16px MiSans'),
    ]).then(()=>{if(!cancelled)cleanup=initialize();}).catch(()=>{
      if(!cancelled)setError('MiSans 字体加载失败，请刷新页面重试');
    });
    return ()=>{cancelled=true;cleanup?.();};
  },[retry]);
  useEffect(()=>{controls.current?.navigate();},[props.mineId,props.reset]);
  useEffect(()=>{controls.current?.select();},[props.equipmentId]);
  useEffect(()=>{if(props.focusRequest)controls.current?.focus();},[props.focusRequest]);
  return <div className="cesium-viewer-shell" ref={host} data-phase={phase}><div id="cesiumContainer" className="cesium-container" aria-label="预制矿区地图"/><div ref={credits} className="cesium-attribution"/>{(error||status||phase==='entering'||phase==='returning')&&<div className="scene-map-status" role="status">{error||status||(phase==='entering'?'正在定位矿区…':'正在返回全国…')}{(error||status.includes('失败'))&&<button onClick={()=>{setError('');setStatus('');setRetry(n=>n+1);}}>重试</button>}</div>}</div>;
}

