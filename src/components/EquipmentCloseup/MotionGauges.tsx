export interface MotionReading {equipmentId:string;speed:number;distance:number;totalDistance:number;elapsed:number;duration:number;state:string}
function Dial({label,value,max,unit}:{label:string;value?:number;max:number;unit:string}) {
  const ratio=value===undefined?0:Math.max(0,Math.min(1,value/max));
  return <div className="ec-dial"><svg viewBox="0 0 100 82" role="img" aria-label={`${label} ${value?.toFixed(1)??'暂无数据'} ${unit}`}>
    <path d="M18 64 A38 38 0 1 1 82 64" className="ec-dial-track"/>
    {Array.from({length:9},(_,i)=>{const a=(-220+i*32.5)*Math.PI/180;return <line key={i} x1={50+33*Math.cos(a)} y1={43+33*Math.sin(a)} x2={50+38*Math.cos(a)} y2={43+38*Math.sin(a)}/>})}
    {value!==undefined&&<g className="ec-needle" style={{transform:`rotate(${-130+ratio*260}deg)`}}><path d="M48.7 43 L50 13 L51.3 43 Z"/><circle cx="50" cy="43" r="2.5"/></g>}
    <text x="50" y="65" textAnchor="middle">{value?.toFixed(1)??'—'}</text><text x="50" y="78" textAnchor="middle" className="ec-dial-unit">{unit}</text>
  </svg><span>{label}</span></div>;
}
function Rail({label,value,max,unit}:{label:string;value?:number;max?:number;unit:string}) {
  const ratio=value!==undefined&&max?Math.min(1,Math.max(0,value/max)):0;
  return <div className="ec-instrument-rail"><div><span>{label}</span><span>{value===undefined?'—':Math.round(value)} / {max===undefined?'—':Math.round(max)} {unit}</span></div><div className="ec-instrument-track"><i style={{width:`${ratio*100}%`}}/>{value!==undefined&&<b style={{left:`${ratio*100}%`}}/>}</div></div>;
}
export default function MotionGauges({motion,load}:{motion?:MotionReading;load?:number}) {
  const percent=motion?Math.round(motion.distance/Math.max(1,motion.totalDistance)*100):undefined;
  return <div className="ec-instruments"><div className="ec-instrument-row"><Dial label="行驶速度" value={motion?.speed} max={60} unit="km/h · 0–60"/><Dial label="发动机负载" value={load} max={100} unit="% · 0–100"/><div className="ec-trip"><small>路线进度 / ROUTE</small><strong>{percent??'—'}<em>%</em></strong><span>{motion?.state??'准备中'}</span></div></div><Rail label="DISTANCE / 行程" value={motion?.distance} max={motion?.totalDistance} unit="m"/><Rail label="TIME / 用时" value={motion?.elapsed} max={motion?.duration} unit="s"/><p className="ec-instrument-note">速度与行程：场景播放 · 负载：遥测快照</p></div>;
}
