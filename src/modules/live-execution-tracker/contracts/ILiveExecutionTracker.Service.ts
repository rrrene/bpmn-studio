import {Subscription} from '@essential-projects/event_aggregator_contracts';
import {IIdentity} from '@essential-projects/iam_contracts';
import {IShape} from '@process-engine/bpmn-elements_contracts';
import {DataModels} from '@process-engine/management_api_contracts';
import {ActiveToken} from '@process-engine/management_api_contracts/dist/data_models/kpi';

export interface ILiveExecutionTrackerService {
  finishEmptyActivity(processInstanceId: string, correlationId: string, emptyActivity: DataModels.EmptyActivities.EmptyActivity): Promise<void>;

  getActiveTokensForProcessInstance(processInstanceId: string): Promise<Array<ActiveToken> | null>;
  getCorrelationById(correlationId: string): Promise<DataModels.Correlations.Correlation>;
  getEmptyActivitiesForProcessInstance(processInstanceId: string): Promise<DataModels.EmptyActivities.EmptyActivityList | null>;
  getProcessModelByProcessInstanceId(correlationId: string, processInstanceId: string): Promise<DataModels.Correlations.CorrelationProcessModel>;
  getProcessModelById(processModelId: string): Promise<DataModels.ProcessModels.ProcessModel>;
  getTokenHistoryGroupForProcessInstance(processInstanceId: string): Promise<DataModels.TokenHistory.TokenHistoryGroup | null>;

  getProcessInstanceIdOfCallActivityTarget(correlationId: string, processInstanceIdOfOrigin: string, callActivityTargetId: string): Promise<string>;
  getElementById(elementId: string): IShape;
  getAllElementsThatCanHaveAToken(): Array<IShape>;
  getElementsWithActiveToken(processInstanceId: string): Promise<Array<IShape> | null>;
  getElementsWithTokenHistory(processInstanceId: string): Promise<Array<IShape> | null>;
  getCallActivities(): Array<IShape>;
  getActiveCallActivities(processInstanceId: string): Promise<Array<IShape>>;
  getInactiveCallActivities(processInstanceId: string): Promise<Array<IShape>>;
  getOutgoingElementsOfElement(element: IShape,
                               tokenHistoryGroups: DataModels.TokenHistory.TokenHistoryGroup,
                               activeTokens: Array<ActiveToken>): Array<IShape>;

  elementHasActiveToken(elementId: string, activeTokens: Array<ActiveToken>): boolean;
  elementHasTokenHistory(elementId: string, tokenHistoryGroups: DataModels.TokenHistory.TokenHistoryGroup): boolean;

  setIdentity(identity: IIdentity): void;

  importXmlIntoDiagramModeler(xml: string): Promise<void>;
  exportXmlFromDiagramModeler(): Promise<string>;
  clearDiagramColors(): void;
  getColorizedXml(processInstanceId: string): Promise<string>;

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
