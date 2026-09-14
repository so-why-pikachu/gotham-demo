export const DATASET_VERSION = 2;
export const AS_OF = '2026-09-12T09:00:00+08:00';
export const profiles = {
  XDE240: {system:'冷却系统',field:'冷却液温度',unit:'℃',normal:86,abnormal:103,task:'主运输线矿石转运',finding:'连续重载后温度上升，散热器表面附着粉尘；停车检查未发现明显泄漏。',action:'安排清洁散热器、检查风扇驱动与管路，完成负载复测后评估是否更换散热总成。',costs:[['散热系统备件预留',126000],['清洁与安装工时',36000],['负载复测',18000]],history:'近一个月两次清洁后温度短期回落，但高负载时再次升高。',next:'2026-09-15',service:'散热系统专项检查'},
  XE215C: {system:'滤清与液压系统',field:'滤清器压差',unit:'MPa',normal:.35,abnormal:.85,task:'台阶采装与边坡整理',finding:'同负载下滤清器压差持续上升，动作响应变慢；现有资料不足以认定泵体损坏。',action:'先更换滤芯并取样检查油液；结合停机记录比较维修与置换方案，暂不直接下采购结论。',costs:[['滤芯及油液取样',880],['检查与复测',400]],history:'一个月内停机三次共18小时，重复检修费用增加；需核验中修记录与二手机残值。',next:'2026-09-13',service:'滤芯更换与油液取样'},
  XC958U: {system:'液压系统',field:'主泵压力',unit:'MPa',normal:24,abnormal:28.5,task:'堆场装载与短倒配合',finding:'装载循环中压力出现波动，接头有轻微油迹；尚未排除管路、传感器及控制阀影响。',action:'依次检查接头密封、传感器读数与控制阀，再决定主泵检修范围。',costs:[['液压检修备件预留',260000],['拆检与装配工时',90000],['标定及复测',30000]],history:'上次更换接头密封后油迹减少，但重载压力波动仍需复核。',next:'2026-09-14',service:'液压管路与压力标定'},
};
export function enrichEquipment(e,i) {
  const p=profiles[e.model],healthy=e.id.endsWith('-02');
  return {...e,serialNumber:`YL-${e.model}-${healthy?'2023':'2020'}-${String(i+1).padStart(3,'0')}`,
    commissionedAt:healthy?'2023-06-15':'2020-08-20',shift:'日班 08:00–20:00',shiftHours:1,
    task:healthy?p.task+'（对照机组）':p.task,lastServiceAt:'2026-09-05',nextServiceAt:p.next,
    servicePlan:p.service,asOf:AS_OF};
}
export function buildTelemetry(e) {
  const p=profiles[e.model],healthy=e.id.endsWith('-02');
  const definitions=[[p.field,p.unit,healthy?p.normal:p.abnormal],['发动机负载','%',healthy?62:78],['燃油消耗率','L/h',e.model==='XDE240'?110:e.model==='XE215C'?18:22]];
  return Array.from({length:145},(_,i)=>definitions.map(([field,unit,target],j)=>({
    equipmentId:e.id,time:new Date(Date.parse(AS_OF)-(144-i)*600000).toISOString(),field,unit,
    value:Number((Number(target)*(1+.025*Math.sin((i-144)*.25+j)-.04*(144-i)/144)).toFixed(2)),
  }))).flat();
}
export function buildDocuments(fleet) {
  const docs=[];
  for(const e of fleet){
    const p=profiles[e.model],healthy=e.id.endsWith('-02');
    const add=(prefix,title,category,date,source,summary,body,extra={})=>docs.push({id:`${prefix}-${e.id}`,equipmentId:e.id,mineId:e.mineId,title:`${e.name} · ${title}`,category,date,source,summary,body,...extra});
    add('ASSET','设备履历','设备档案','2026-08-14','设备管理台账',`${e.serialNumber}，累计 ${e.hours} h。`,
      `设备编号：${e.id}\n型号：${e.model}\n投用日期：${e.commissionedAt}\n累计工时：${e.hours} h（截至9月12日09:00）\n所属班组：玉龙工程一队\n当班任务：${e.task}\n最近保养：9月5日；下一次计划：${e.nextServiceAt}，${e.servicePlan}。\n台账工时与当班工时分开统计，地图位置只用于展示当前作业路径。`);
    add('IOT','24小时运行观察','运行记录','2026-09-12','运行监测记录',healthy?'对照机组运行稳定。':p.finding,
      `观察窗口：9月11日09:00—9月12日09:00，每10分钟采样一次，共145组。\n主观察指标：${p.field}，窗口末值 ${healthy?p.normal:p.abnormal} ${p.unit}。\n${healthy?'与同型号01实例相比，当前参数波动较小，未登记活跃告警；保留日常巡检。':p.finding}\n同时记录发动机负载与燃油消耗率，历史曲线用于比较趋势，不代表厂家报警阈值。`);
    add('WO','巡检与维修工单','维修工单','2026-09-11','维修班组',healthy?'例行巡检完成，无待处理缺陷。':p.service,
      `工单日期：9月11日\n检查对象：${p.system}\n检查结果：${healthy?'紧固件、管路及工作装置检查完成，未发现需停机处理项目。':p.finding}\n处理安排：${healthy?'清洁、润滑并记录运行参数，按计划保养。':p.action}\n验收条件：完成检查清单、空载与作业循环记录，由班组复核签字。`,{status:healthy?'已完成':'待复检',costCents:healthy?68000:Math.round(p.costs.reduce((s,c)=>s+c[1],0)*100*.1)});
    add('HISTORY','月度维修复核','维修工单','2026-09-12','维修履历',healthy?'当月计划保养一次，无非计划停机。':p.history,
      `统计周期：8月14日—9月12日\n${healthy?'完成一次计划保养，用时2小时，材料与工时费用680元；无非计划停机。':p.history}\n对照对象：${e.id.replace(/-0[12]$/,healthy?'-01':'-02')}。比较时需同时核对负载与累计工时，不直接归因于机龄。\n复核要求：工单执行金额与采购预算分开列示，预算不是已发生费用。`);
    add('KB','维护检查卡','技术资料','2026-08-20','工程支持组',p.service,
      `适用范围：${e.model} 的演示维护流程。\n1. 汇总${p.field}与负载记录。\n2. ${p.action}\n3. 记录更换件、工时及复测结果。\n4. 无法定位时升级检查，禁止仅根据曲线认定内部零件损坏。\n说明：此卡为演示编写，不替代制造商维修手册；所有费用与工况数值均为场景假设。`);
  }
  const mineDocs=[
    ['TENDER-YL-2026Q4','第四季度设备维保招标需求草案','招投标','2026-09-10','玉龙项目采购组（虚构）','拟分散热、滤清与液压三个维保标段，尚未发布正式招标公告。','项目编号：YL-MRO-2026Q4（演示）。\n标段一：XDE240 散热系统检查、备件及复测；标段二：XE215C 滤清系统维护与维修、置换两种方案比选；标段三：XC958U 液压系统检修与压力复测。各以一台01实例为初步范围，02实例仅作运行对照。\n计划节点：9月18日前确认技术范围，9月25日前收集意向报价，10月上旬完成内部方案评审，目标实施窗口2026Q4。日期为场景计划，未正式启动招标。\n交付要求：列明备件清单、工时、运输、税费、质保范围及现场停机时长；与生产调度确认窗口后实施。\n当前状态：需求草案，未发布公告、未定标、未形成订单；全文为虚构演示资料。'],
    ['TENDER-YL-TECH','维保投标技术响应与验收清单','招投标','2026-09-11','玉龙工程支持组（虚构）','明确三类设备的响应内容、复测证据和验收要求。','适用项目：YL-MRO-2026Q4（演示）。\nXDE240：核查散热回路、风扇及管路，提交冷却液温度和负载对照记录；不得仅凭单次温度判定故障部件。\nXE215C：核查滤清器压差、维护履历和当班工况，分别提交继续维修与设备置换方案；置换仅作备选，不与先行检查费用叠加计入采购金额。\nXC958U：核查主泵压力波动、管路与油液状态，提交作业循环复测记录及更换件追溯信息。\n投标响应须说明适配型号、施工人员、停机窗口、交付周期、质保和例外项。验收需现场检查单、复测记录、材料清单及班组签字，具体阈值由技术组参照设备手册确认。\n本清单为演示草案，不代表制造商技术标准或正式招标文件。'],
    ['TENDER-YL-COMPARE','供应商意向报价与商务评审记录','招投标','2026-09-12','项目采购与财务联合组（虚构）','两家虚构供应商的意向方案对照，预算尚待审批，未推荐中标。','对应项目：YL-MRO-2026Q4（演示）。\n远川工程服务（虚构）：XDE240维保意向预算18万元，XC958U液压检修38万元；XE215C先行检查1280元，置换备选260万元。与现有预算底稿同口径，属于含税假设，尚待正式报价。\n北岭机电服务（虚构）：XDE240维保意向预算19.2万元，XC958U液压检修36.5万元；XE215C暂只响应检查维护，未报置换价。运输费用、备件适配与质保范围需补充，不能仅据金额排序。\n客户预算：尚未审批，以上金额为供应商意向估算，不等于客户预算上限。交付目标为2026Q4，具体到货期与停机计划待书面确认。\n评审待办：统一技术范围与税费口径，补齐资质、备件来源、服务能力、付款条件和质保说明后再评审。当前未定标、未签约、未付款，不自动推送销售团队。\n所有供应商、报价与评审内容均为演示编写，无真实招投标事件。'],
    ['MINE-YL','玉龙项目运营概况','矿区资料','2026-08-14','项目办公室','日班六台设备、三条作业路线。','本演示以玉龙矿区为地理背景，运营单位设为虚构的玉龙工程一队。接入六台设备：XDE240、XE215C、XC958U各两台。东侧及南侧线路为演示路径，不代表现场核定道路。其他三个矿区仅登记基础信息，尚未接入设备遥测。'],
    ['SHIFT-YL','日班施工组织与人员计划','矿区资料','2026-09-12','生产调度组','六个班组，当前126人在岗。','班次08:00—20:00。运输、采装、装载、维修、调度和安全六个班组，当前126人在岗。六台设备分布在主运输、东侧和南侧作业线；01机组重点关注缺陷处理，02机组保留对照数据。设备数量指平台接入数，不代表矿区全部资产。'],
    ['ENV-YL','环境监测周报','运行记录','2026-09-12','环境监测组','八个监测点，粉尘与人员趋势按整点记录。','统计9月5日09:00至9月12日09:00。粉尘、噪声、气温与风速为固定演示序列。当前粉尘0.32 mg/m³、气温12℃、风速3.2 m/s。环境数据只用于展示跨时段比较，不据此宣称符合任何环境标准。'],
    ['PROC-YL','第四季度维护采购需求纪要','商务资料','2026-09-12','项目采购组','先复核缺陷，再确认备件与交付窗口。','采购分三项：矿卡散热系统检查及备件、挖掘机滤清系统维护及置换比较、装载机液压检修。当前尚未形成采购订单。要求技术组确认维修范围，采购组索取正式报价，财务组审批预算。目标窗口2026Q4，融资条件待确认。'],
    ['QUOTE-YL','维保与置换方案预算底稿','商务资料','2026-09-12','远川工程服务（虚构）','预算报价仅用于演示，未形成交易。','矿卡方案预算180000元：备件126000、工时36000、复测18000。装载机方案预算380000元：备件260000、工时90000、复测30000。挖掘机先行检查1280元；置换方案预算2600000元：设备2450000、运输90000、交付培训60000。金额为含税预算假设，旧机残值及融资成本未计入，须询价核实。'],
    ['CLOSE-YL','八月例保验收汇总','结案资料','2026-08-28','设备与采购联合组','02机组三台例行保养已完成。','三台02实例完成清洁、润滑、紧固与运行复测，各发生材料及工时费用680元，合计2040元。此结案只涉及例行保养，不表示01实例的当前缺陷已解决。验收记录归档后继续按计划检查。'],
  ];
  for(const [id,title,category,date,source,summary,body] of mineDocs)docs.push({id,title,category,date,source,summary,body,equipmentId:'',mineId:'yulong-mine'});
  return docs;
}
export function buildScenarioReports(fleet,docs) {
  const out=[];
  const snapshot=ids=>ids.map(id=>({id,title:docs.find(d=>d.id===id).title,body:docs.find(d=>d.id===id).body}));
  for(const e of fleet){
    const p=profiles[e.model],healthy=e.id.endsWith('-02');
    const costs=p.costs.map(([label,yuan])=>({label,amountCents:yuan*100}));
    const make=(suffix,collection,title,ids,extra={})=>{
      const evidenceSnapshot=snapshot(ids);
      const r={id:`CASE-${e.id}-${suffix}`,version:1,type:'diagnosis',collection,equipmentId:e.id,mineId:e.mineId,customerId:e.customerId,
        title:`${e.name} · ${title}`,conclusion:healthy?'运行稳定，继续计划保养':p.finding,
        evidenceIds:ids,evidence:evidenceSnapshot.map(d=>`${d.title}\n${d.body}`),evidenceSnapshot,
        createdAt:'2026-09-12T09:00:00+08:00',confidence:healthy?82:64,reviewed:false,decision:healthy?'计划保养':'维护评估',
        amountCents:healthy?0:costs.reduce((s,c)=>s+c.amountCents,0),costItems:healthy?[]:costs,
        sections:[{title:'观察与影响',body:healthy?'当前无活跃告警，可作为同型号趋势对照；单次正常记录不代表永久无故障。':p.finding},
          {title:'处置建议',body:healthy?`按${e.nextServiceAt}计划完成${p.service}。`:p.action},
          {title:'待确认事项',body:'现场复测结果、维修范围与正式报价尚需确认；当前预算不代表已发生费用或采购承诺。'}],...extra};out.push(r);return r;
    };
    const initial=make('diagnosis','diagnosis','运行诊断',[`IOT-${e.id}`,`WO-${e.id}`]);
    if(healthy){make('archive','archive','八月例保结案',['CLOSE-YL'],{createdAt:'2026-08-28T17:00:00+08:00',decision:'例保已完成',conclusion:'例行保养完成，进入计划巡检',amountCents:68000,costItems:[{label:'材料与保养工时',amountCents:68000}],sections:[{title:'完成项目',body:'清洁、润滑、紧固和运行复测全部完成。'}, {title:'费用与边界',body:'已发生材料与工时费用680元；不包含未来维护预算。'}]});continue;}
    const review=make('review','reviews','维护方案复核',[`IOT-${e.id}`,`WO-${e.id}`,`HISTORY-${e.id}`,'QUOTE-YL'],{reviewed:true,createdAt:'2026-09-12T09:00:00+08:00',parentReportId:initial.id,conclusion:p.history});
    if(e.model==='XE215C'){review.decision='置换评估';review.costItems=[{label:'设备预算',amountCents:245000000},{label:'运输预算',amountCents:9000000},{label:'交付培训',amountCents:6000000}];review.amountCents=260000000;review.sections.push({title:'维修与置换比较',body:'先行检查预算1280元；置换预算260万元。需补齐旧机残值、停机损失与剩余寿命后比较，暂不认定置换更经济。'});}
    const demand=make('demand','demand',`${review.decision}需求书`,[...review.evidenceIds,'PROC-YL'],{type:'business',sourceId:review.id,sourceVersion:1,createdAt:'2026-09-12T09:00:00+08:00',decision:review.decision,amountCents:review.amountCents,costItems:review.costItems,units:1,delivery:'2026Q4',finance:false,sent:false,sections:[{title:'采购范围',body:`依据复核结论安排${p.system}维护或方案比较。${p.action}`},{title:'交付与预算',body:'目标交付窗口2026Q4，当前为一台／套预算，含税假设口径；无正式订单，客户预算尚待审批。'},{title:'商务前置条件',body:'确认技术范围、现场停机窗口、正式报价及付款方式。供应商为虚构演示单位。'}]});
    make('follow','follow-up','采购沟通记录',[...demand.evidenceIds],{type:'business',sourceId:review.id,sourceVersion:1,parentReportId:demand.id,createdAt:'2026-09-12T09:00:00+08:00',decision:'待范围确认',conclusion:'采购组已登记需求，等待技术范围与预算审批',amountCents:demand.amountCents,costItems:demand.costItems,units:1,delivery:'2026Q4',finance:false,sent:false,sections:[{title:'本次沟通',body:'9月12日采购组登记需求；工程支持组承诺先补充检查清单，尚未发送正式采购订单。'},{title:'下一步',body:`9月15日前确认${p.system}检查范围，9月18日前取得报价；由项目采购组跟进，财务审批未完成。`}]});
  }
  return out;
}
