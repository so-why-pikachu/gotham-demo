export interface EquipmentAlert {
  id: string;
  equipmentId: string;
  title: string;
  severity: string;
  mock: boolean;
  visualization?: { part: string; scope: 'region' | 'part'; component: string };
}
export interface Equipment {
  serialNumber?: string;
  commissionedAt?: string;
  task?: string;
  shift?: string;
  shiftHours?: number;
  lastServiceAt?: string;
  nextServiceAt?: string;
  asOf?: string;
  id: string;
  name: string;
  model: string;
  type: string;
  status: string;
  mineId: string;
  customerId: string;
  modelUri: string;
  hours: number;
}
export interface MineMetricsSnapshot {
  mineId: string;
  range: 'current' | '24h' | '7d';
  asOf: string;
  mock: true;
  connected: boolean;
  period: {from:string;to:string};
  groups: {title:string;items:[string,string|number|null,string][]}[];
  series: {time:string;dust:number;workers:number}[];
}
export interface Report {
  collection?: 'diagnosis'|'reviews'|'demand'|'follow-up'|'archive';
  sections?: {title:string;body:string}[];
  costItems?: {label:string;amountCents:number}[];
  evidenceSnapshot?: {id:string;title:string;body:string}[];
  parentReportId?: string;
  id: string;
  version: number;
  type: "diagnosis" | "business";
  equipmentId: string;
  customerId: string;
  mineId: string;
  title: string;
  conclusion: string;
  evidenceIds: string[];
  evidence: string[];
  createdAt: string;
  confidence: number;
  reviewed: boolean;
  decision: string;
  amountCents: number;
  sourceId?: string;
  sourceVersion?: number;
  documentIds?: string[];
  units?: number;
  delivery?: string;
  finance?: boolean;
  sent?: boolean;
}
export interface Document {
  mineId?: string;
  source?: string;
  summary?: string;
  id: string;
  equipmentId: string;
  title: string;
  category: string;
  date: string;
  body: string;
}
export interface List<T> {
  items: T[];
  total: number;
  mock: true;
}
export interface Snapshot {
  equipment: Equipment[];
  reports: Report[];
  documents: Document[];
  customers: { id: string; name: string; category: string }[];
  mines: { id: string; name: string;region?:string;mineral?:string;operator?:string;connected?:boolean }[];
  opportunities: {
    id: string;
    equipmentId: string;
    title: string;
    amountCents: number;
  }[];
}
export type BridgeMessage = {
  protocol: "gotham-report";
  version: 1;
  type: string;
  requestId: string;
  payload?: any;
};
