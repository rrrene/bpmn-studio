import {IIdentity} from '@essential-projects/iam_contracts';
import {DataModels} from '@process-engine/management_api_contracts';

export interface IInspectCorrelationService {
  getAllCorrelationsForProcessModelId(processModelId: string, identity: IIdentity): Promise<Array<DataModels.Correlations.Correlation>>;
  getLogsForCorrelation(correlation: DataModels.Correlations.Correlation, identity: IIdentity): Promise<Array<DataModels.Logging.LogEntry>>;
  getLogsForProcessInstance(processModelId: string, processInstance: string, identity: IIdentity): Promise<Array<DataModels.Logging.LogEntry>>;
  getTokenForFlowNodeInstance(
    processModelId: string,
    correlationId: string,
    flowNodeId: string,
    identity: IIdentity,
  ): Promise<Array<DataModels.TokenHistory.TokenHistoryEntry>>;
}
