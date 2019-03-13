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

  createProcessEndedEventListener(correlationId: string, callback: Function): Promise<Subscription>;
  createProcessTerminatedEventListener(correlationId: string, callback: Function): Promise<Subscription>;

  createUserTaskWaitingEventListener(correlationId: string, callback: Function): Promise<Subscription>;
  createUserTaskFinishedEventListener(correlationId: string, callback: Function): Promise<Subscription>;
  createManualTaskWaitingEventListener(correlationId: string, callback: Function): Promise<Subscription>;
  createManualTaskFinishedEventListener(correlationId: string, callback: Function): Promise<Subscription>;
  createEmptyActivityWaitingEventListener(correlationId: string, callback: Function): Promise<Subscription>;
  createEmptyActivityFinishedEventListener(correlationId: string, callback: Function): Promise<Subscription>;

  removeSubscription(subscription: Subscription): Promise<void>;
}
