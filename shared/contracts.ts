export interface Equipment {
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
export interface Report {
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
  units?: number;
  delivery?: string;
  finance?: boolean;
  sent?: boolean;
}
export interface Document {
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
  mines: { id: string; name: string }[];
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
