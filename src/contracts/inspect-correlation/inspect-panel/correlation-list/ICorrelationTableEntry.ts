export interface ICorrelationTableEntry {
  index: number;
  startedAt: string;
  state: string;
  user: string;
  correlationId: string;
  processInstanceId: string;
}
