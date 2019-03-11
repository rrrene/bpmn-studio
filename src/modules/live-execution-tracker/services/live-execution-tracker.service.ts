import {inject} from 'aurelia-framework';

import {IIdentity} from '@essential-projects/iam_contracts';
import {IModdleElement, IShape} from '@process-engine/bpmn-elements_contracts';
import {DataModels} from '@process-engine/management_api_contracts';
import {ActiveToken} from '@process-engine/management_api_contracts/dist/data_models/kpi';

import { TokenHistoryEntry } from '@process-engine/management_api_contracts/dist/data_models/token_history';
import {IElementRegistry} from '../../../contracts/index';
import {ILiveExecutionTrackerRepository, ILiveExecutionTrackerService} from '../contracts/index';

@inject('LiveExecutionTrackerRepository')
export class LiveExecutionTrackerService implements ILiveExecutionTrackerService {
  private _liveExecutionTrackerRepository: ILiveExecutionTrackerRepository;

  constructor(liveExecutionTrackerRepository: ILiveExecutionTrackerRepository) {
    this._liveExecutionTrackerRepository = liveExecutionTrackerRepository;
  }

  public setIdentity(identity: IIdentity): void {
    this._liveExecutionTrackerRepository.setIdentity(identity);
  }

  public getCorrelationById(correlationId: string): Promise<DataModels.Correlations.Correlation> {
    return this._liveExecutionTrackerRepository.getCorrelationById(correlationId);
  }

  public getTokenHistoryGroupForProcessInstance(processInstanceId: string): Promise<DataModels.TokenHistory.TokenHistoryGroup | null> {
    return this._liveExecutionTrackerRepository.getTokenHistoryGroupForProcessInstance(processInstanceId);
  }

  public getActiveTokensForProcessInstance(processInstanceId: string): Promise<Array<DataModels.Kpi.ActiveToken>> {
    return this._liveExecutionTrackerRepository.getActiveTokensForProcessInstance(processInstanceId);
  }

  public getEmptyActivitiesForProcessInstance(processInstanceId: string): Promise<DataModels.EmptyActivities.EmptyActivityList | null> {
    return this._liveExecutionTrackerRepository.getEmptyActivitiesForProcessInstance(processInstanceId);
  }

  public getProcessModelById(processModelId: string): Promise<DataModels.ProcessModels.ProcessModel> {
    return this._liveExecutionTrackerRepository.getProcessModelById(processModelId);
  }

  public finishEmptyActivity(processInstanceId: string,
                             correlationId: string,
                             emptyActivity: DataModels.EmptyActivities.EmptyActivity): Promise<void> {

    return this._liveExecutionTrackerRepository.finishEmptyActivity(processInstanceId, correlationId, emptyActivity);
  }

  public createProcessEndedEventListener(correlationId: string, callback: Function): void {
    this._liveExecutionTrackerRepository.createProcessEndedEventListener(correlationId, callback);
  }
  public createProcessTerminatedEventListener(correlationId: string, callback: Function): void {
    this._liveExecutionTrackerRepository.createProcessTerminatedEventListener(correlationId, callback);
  }

  public createUserTaskWaitingEventListener(correlationId: string, processStopped: () => boolean, callback: Function): void {
    this._liveExecutionTrackerRepository.createUserTaskWaitingEventListener(correlationId, processStopped, callback);
  }
  public createUserTaskFinishedEventListener(correlationId: string, processStopped: () => boolean, callback: Function): void {
    this._liveExecutionTrackerRepository.createUserTaskFinishedEventListener(correlationId, processStopped, callback);
  }
  public createManualTaskWaitingEventListener(correlationId: string, processStopped: () => boolean, callback: Function): void {
    this._liveExecutionTrackerRepository.createManualTaskWaitingEventListener(correlationId, processStopped, callback);
  }
  public createManualTaskFinishedEventListener(correlationId: string, processStopped: () => boolean, callback: Function): void {
    this._liveExecutionTrackerRepository.createManualTaskFinishedEventListener(correlationId, processStopped, callback);
  }
  public createEmptyActivityWaitingEventListener(correlationId: string, processStopped: () => boolean, callback: Function): void {
    this._liveExecutionTrackerRepository.createEmptyActivityWaitingEventListener(correlationId, processStopped, callback);
  }
  public createEmptyActivityFinishedEventListener(correlationId: string, processStopped: () => boolean, callback: Function): void {
    this._liveExecutionTrackerRepository.createEmptyActivityFinishedEventListener(correlationId, processStopped, callback);
  }

  public async getElementsWithActiveToken(elementRegistry: IElementRegistry, processInstanceId: string): Promise<Array<IShape> | null> {
    const elements: Array<IShape> = this.getAllElementsThatCanHaveAToken(elementRegistry);

    const activeTokens: Array<ActiveToken> | null = await this.getActiveTokensForProcessInstance(processInstanceId);
    const couldNotGetActiveTokens: boolean = activeTokens === null;
    if (couldNotGetActiveTokens) {
      return null;
    }

    // this._activeTokens = activeTokens;
    const elementsWithActiveToken: Array<IShape> = activeTokens.map((activeToken: ActiveToken): IShape => {
      const elementWithActiveToken: IShape = elements.find((element: IShape) => {
        return element.id === activeToken.flowNodeId;
      });

      return elementWithActiveToken;
    });

    return elementsWithActiveToken;
  }

  public async getElementsWithTokenHistory(elementRegistry: IElementRegistry, processInstanceId: string): Promise<Array<IShape> | null> {

    const elements: Array<IShape> = this.getAllElementsThatCanHaveAToken(elementRegistry);

    const tokenHistoryGroups: DataModels.TokenHistory.TokenHistoryGroup = await this.getTokenHistoryGroupForProcessInstance(processInstanceId);

    const activeTokens: Array<ActiveToken> = await this.getActiveTokensForProcessInstance(processInstanceId);

    const couldNotGetTokenHistory: boolean = tokenHistoryGroups === null;
    if (couldNotGetTokenHistory) {
      return null;
    }

    const elementsWithTokenHistory: Array<IShape> = [];

    for (const flowNodeId in tokenHistoryGroups) {
      const elementFromTokenHistory: IShape = elements.find((element: IShape) => {
        return element.id === flowNodeId;
      });

      const elementFinished: boolean = tokenHistoryGroups[flowNodeId].find((tokenHistoryEntry: TokenHistoryEntry) => {
        return tokenHistoryEntry.tokenEventType === DataModels.TokenHistory.TokenEventType.onExit;
      }) !== undefined;

      if (elementFinished) {
        elementsWithTokenHistory.push(elementFromTokenHistory);

        const outgoingElements: Array<IShape> = this.getOutgoingElementsOfElement(elementRegistry,
                                                                                  elementFromTokenHistory,
                                                                                  tokenHistoryGroups,
                                                                                  activeTokens);

        elementsWithTokenHistory.push(...outgoingElements);
      }
    }

    return elementsWithTokenHistory;
  }

  public getAllElementsThatCanHaveAToken(elementRegistry: IElementRegistry): Array<IShape> {
    const allElementsThatCanHaveAToken: Array<IShape> = elementRegistry.filter((element: IShape): boolean => {
      const elementCanHaveAToken: boolean = element.type !== 'bpmn:SequenceFlow'
                                         && element.type !== 'bpmn:Collaboration'
                                         && element.type !== 'bpmn:Participant'
                                         && element.type !== 'bpmn:Lane'
                                         && element.type !== 'label';

      return elementCanHaveAToken;
    });

    return allElementsThatCanHaveAToken;
  }

    public getOutgoingElementsOfElement(elementRegistry: IElementRegistry,
                                        element: IShape,
                                        tokenHistoryGroups: DataModels.TokenHistory.TokenHistoryGroup,
                                        activeTokens: Array<ActiveToken>): Array<IShape> {

    const outgoingElementsAsIModdleElement: Array<IModdleElement> = element.businessObject.outgoing;

    const elementHasNoOutgoingElements: boolean = outgoingElementsAsIModdleElement === undefined;
    if (elementHasNoOutgoingElements) {
      return [];
    }

    const elementsWithOutgoingElements: Array<IShape> = [];

    for (const outgoingElement of outgoingElementsAsIModdleElement) {
      const outgoingElementAsShape: IShape = elementRegistry.get(outgoingElement.id);
      const targetOfOutgoingElement: IShape = outgoingElementAsShape.target;

      const outgoingElementHasNoTarget: boolean = targetOfOutgoingElement === undefined;
      if (outgoingElementHasNoTarget) {
        continue;
      }

      const outgoingElementHasNoActiveToken: boolean = !this.elementHasActiveToken(targetOfOutgoingElement.id, activeTokens);
      const targetOfOutgoingElementHasNoTokenHistory: boolean = !this.elementHasTokenHistory(targetOfOutgoingElement.id, tokenHistoryGroups);

      if (outgoingElementHasNoActiveToken && targetOfOutgoingElementHasNoTokenHistory) {
        continue;
      }

      const outgoingElementIsSequenceFlow: boolean = outgoingElementAsShape.type === 'bpmn:SequenceFlow';
      if (outgoingElementIsSequenceFlow) {
        const tokenHistoryForTarget: TokenHistoryEntry = tokenHistoryGroups[targetOfOutgoingElement.id][0];
        const previousFlowNodeInstanceIdOfTarget: string = tokenHistoryForTarget.previousFlowNodeInstanceId;

        const tokenHistoryForElement: TokenHistoryEntry = tokenHistoryGroups[element.id][0];
        const flowNodeInstanceIdOfElement: string = tokenHistoryForElement.flowNodeInstanceId;

        // This is needed because the ParallelGateway only knows the flowNodeId of the first element that reaches the ParallelGateway
        const targetOfOutgoingElementIsGateway: boolean = targetOfOutgoingElement.type === 'bpmn:ParallelGateway';
        const sequenceFlowWasExecuted: boolean = previousFlowNodeInstanceIdOfTarget === flowNodeInstanceIdOfElement;

        const outgoingElementWasUsed: boolean  = sequenceFlowWasExecuted || targetOfOutgoingElementIsGateway;
        if (outgoingElementWasUsed) {
          elementsWithOutgoingElements.push(outgoingElementAsShape);
        }

        continue;
      }

      elementsWithOutgoingElements.push(outgoingElementAsShape);
    }

    return elementsWithOutgoingElements;
  }

  public elementHasTokenHistory(elementId: string, tokenHistoryGroups: DataModels.TokenHistory.TokenHistoryGroup): boolean {

    const tokenHistoryFromFlowNodeInstanceFound: boolean = tokenHistoryGroups[elementId] !== undefined;

    return tokenHistoryFromFlowNodeInstanceFound;
  }

  public elementHasActiveToken(elementId: string, activeTokens: Array<ActiveToken>): boolean {
    const activeTokenForFlowNodeInstance: ActiveToken = activeTokens.find((activeToken: ActiveToken) => {
      const activeTokenIsFromFlowNodeInstance: boolean = activeToken.flowNodeId === elementId;

      return activeTokenIsFromFlowNodeInstance;
    });

    return activeTokenForFlowNodeInstance !== undefined;
  }
}
