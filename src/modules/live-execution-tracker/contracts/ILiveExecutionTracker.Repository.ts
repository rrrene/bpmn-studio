import {Subscription} from '@essential-projects/event_aggregator_contracts';
import {IIdentity} from '@essential-projects/iam_contracts';
import {DataModels} from '@process-engine/management_api_contracts';
import {ActiveToken} from '@process-engine/management_api_contracts/dist/data_models/kpi';

export interface ILiveExecutionTrackerRepository {
  finishEmptyActivity(processInstanceId: string, correlationId: string, emptyActivity: DataModels.EmptyActivities.EmptyActivity): Promise<void>;
  terminateProcess(processInstanceId: string): Promise<void>;

  getActiveTokensForProcessInstance(processInstanceId: string): Promise<Array<ActiveToken> | null>;
  getCorrelationById(correlationId: string): Promise<DataModels.Correlations.Correlation>;
  getEmptyActivitiesForProcessInstance(processInstanceId: string): Promise<DataModels.EmptyActivities.EmptyActivityList | null>;
  getProcessModelById(processModelId: string): Promise<DataModels.ProcessModels.ProcessModel>;
  getTokenHistoryGroupForProcessInstance(processInstanceId: string): Promise<DataModels.TokenHistory.TokenHistoryGroup | null>;

  setIdentity(identity: IIdentity): void;

  createProcessEndedEventListener(processInstanceId: string, callback: Function): Promise<Subscription>;
  createProcessTerminatedEventListener(processInstanceId: string, callback: Function): Promise<Subscription>;

  createUserTaskWaitingEventListener(processInstanceId: string, callback: Function): Promise<Subscription>;
  createUserTaskFinishedEventListener(processInstanceId: string, callback: Function): Promise<Subscription>;
  createManualTaskWaitingEventListener(processInstanceId: string, callback: Function): Promise<Subscription>;
  createManualTaskFinishedEventListener(processInstanceId: string, callback: Function): Promise<Subscription>;
  createEmptyActivityWaitingEventListener(processInstanceId: string, callback: Function): Promise<Subscription>;
  createEmptyActivityFinishedEventListener(processInstanceId: string, callback: Function): Promise<Subscription>;

  removeSubscription(subscription: Subscription): Promise<void>;
}
