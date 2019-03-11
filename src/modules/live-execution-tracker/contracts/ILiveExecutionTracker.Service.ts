import {IIdentity} from '@essential-projects/iam_contracts';
import {DataModels} from '@process-engine/management_api_contracts';
import {ActiveToken} from '@process-engine/management_api_contracts/dist/data_models/kpi';

export interface ILiveExecutionTrackerService {
  finishEmptyActivity(processInstanceId: string, correlationId: string, emptyActivity: DataModels.EmptyActivities.EmptyActivity): Promise<void>;

  getActiveTokensForProcessInstance(processInstanceId: string): Promise<Array<ActiveToken> | null>;
  getCorrelationById(correlationId: string): Promise<DataModels.Correlations.Correlation>;
  getEmptyActivitiesForProcessInstance(processInstanceId: string): Promise<DataModels.EmptyActivities.EmptyActivityList | null>;
  getProcessModelById(processModelId: string): Promise<DataModels.ProcessModels.ProcessModel>;
  getTokenHistoryGroupForProcessInstance(processInstanceId: string): Promise<DataModels.TokenHistory.TokenHistoryGroup | null>;

  setIdentity(identity: IIdentity): void;

  createProcessEndedEventListener(correlationId: string, callback: Function): void;
  createProcessTerminatedEventListener(correlationId: string, callback: Function): void;

  createUserTaskWaitingEventListener(correlationId: string, processStopped: () => boolean, callback: Function): void;
  createUserTaskFinishedEventListener(correlationId: string, processStopped: () => boolean, callback: Function): void;
  createManualTaskWaitingEventListener(correlationId: string, processStopped: () => boolean, callback: Function): void;
  createManualTaskFinishedEventListener(correlationId: string, processStopped: () => boolean, callback: Function): void;
  createEmptyActivityWaitingEventListener(correlationId: string, processStopped: () => boolean, callback: Function): void;
  createEmptyActivityFinishedEventListener(correlationId: string, processStopped: () => boolean, callback: Function): void;
}
