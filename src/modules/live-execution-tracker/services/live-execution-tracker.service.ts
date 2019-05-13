import {inject} from 'aurelia-framework';

import {Subscription} from '@essential-projects/event_aggregator_contracts';
import {IIdentity} from '@essential-projects/iam_contracts';
import {IModdleElement, IShape} from '@process-engine/bpmn-elements_contracts';
import * as bundle from '@process-engine/bpmn-js-custom-bundle';
import {DataModels} from '@process-engine/management_api_contracts';
import {CorrelationProcessInstance} from '@process-engine/management_api_contracts/dist/data_models/correlation';
import {ActiveToken} from '@process-engine/management_api_contracts/dist/data_models/kpi';
import {TokenHistoryEntry} from '@process-engine/management_api_contracts/dist/data_models/token_history';

import {defaultBpmnColors, IBpmnModeler, IBpmnXmlSaveOptions, IColorPickerColor, IElementRegistry, IModeling} from '../../../contracts/index';
import {ILiveExecutionTrackerRepository, ILiveExecutionTrackerService} from '../contracts/index';

@inject('LiveExecutionTrackerRepository')
export class LiveExecutionTrackerService implements ILiveExecutionTrackerService {
  private _liveExecutionTrackerRepository: ILiveExecutionTrackerRepository;

  private _diagramModeler: IBpmnModeler;
  private _modeling: IModeling;
  private _elementRegistry: IElementRegistry;

  constructor(liveExecutionTrackerRepository: ILiveExecutionTrackerRepository) {
    this._liveExecutionTrackerRepository = liveExecutionTrackerRepository;

    this._diagramModeler = new bundle.modeler();
    this._modeling = this._diagramModeler.get('modeling');
    this._elementRegistry = this._diagramModeler.get('elementRegistry');
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

  public createProcessEndedEventListener(processInstanceId: string, callback: Function): Promise<Subscription> {
    return this._liveExecutionTrackerRepository.createProcessEndedEventListener(processInstanceId, callback);
  }

  public createProcessTerminatedEventListener(processInstanceId: string, callback: Function): Promise<Subscription> {
    return this._liveExecutionTrackerRepository.createProcessTerminatedEventListener(processInstanceId, callback);
  }

  public createUserTaskWaitingEventListener(processInstanceId: string, callback: Function): Promise<Subscription> {
    return this._liveExecutionTrackerRepository.createUserTaskWaitingEventListener(processInstanceId, callback);
  }

  public createUserTaskFinishedEventListener(processInstanceId: string, callback: Function): Promise<Subscription> {
    return this._liveExecutionTrackerRepository.createUserTaskFinishedEventListener(processInstanceId, callback);
  }

  public createManualTaskWaitingEventListener(processInstanceId: string, callback: Function): Promise<Subscription> {
    return this._liveExecutionTrackerRepository.createManualTaskWaitingEventListener(processInstanceId, callback);
  }

  public createManualTaskFinishedEventListener(processInstanceId: string, callback: Function): Promise<Subscription> {
    return this._liveExecutionTrackerRepository.createManualTaskFinishedEventListener(processInstanceId, callback);
  }

  public createEmptyActivityWaitingEventListener(processInstanceId: string, callback: Function): Promise<Subscription> {
    return this._liveExecutionTrackerRepository.createEmptyActivityWaitingEventListener(processInstanceId, callback);
  }

  public createEmptyActivityFinishedEventListener(processInstanceId: string, callback: Function): Promise<Subscription> {
    return this._liveExecutionTrackerRepository.createEmptyActivityFinishedEventListener(processInstanceId, callback);
  }

  public removeSubscription(subscription: Subscription): Promise<void> {
    return this._liveExecutionTrackerRepository.removeSubscription(subscription);
  }

  public async getElementsWithActiveToken(processInstanceId: string): Promise<Array<IShape> | null> {
    const elements: Array<IShape> = this.getAllElementsThatCanHaveAToken();

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

  public async getElementsWithTokenHistory(processInstanceId: string): Promise<Array<IShape> | null> {

    const elements: Array<IShape> = this.getAllElementsThatCanHaveAToken();

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

        const outgoingElements: Array<IShape> = this.getOutgoingElementsOfElement(elementFromTokenHistory,
                                                                                  tokenHistoryGroups,
                                                                                  activeTokens);

        elementsWithTokenHistory.push(...outgoingElements);
      }
    }

    return elementsWithTokenHistory;
  }

  public getAllElementsThatCanHaveAToken(): Array<IShape> {
    const allElementsThatCanHaveAToken: Array<IShape> = this._elementRegistry.filter((element: IShape): boolean => {
      const elementCanHaveAToken: boolean = element.type !== 'bpmn:SequenceFlow'
                                         && element.type !== 'bpmn:Collaboration'
                                         && element.type !== 'bpmn:Participant'
                                         && element.type !== 'bpmn:Lane'
                                         && element.type !== 'label';

      return elementCanHaveAToken;
    });

    return allElementsThatCanHaveAToken;
  }

    public getOutgoingElementsOfElement(element: IShape,
                                        tokenHistoryGroups: DataModels.TokenHistory.TokenHistoryGroup,
                                        activeTokens: Array<ActiveToken>): Array<IShape> {

    const outgoingElementsAsIModdleElement: Array<IModdleElement> = element.businessObject.outgoing;

    const elementHasNoOutgoingElements: boolean = outgoingElementsAsIModdleElement === undefined;
    if (elementHasNoOutgoingElements) {
      return [];
    }

    const elementsWithOutgoingElements: Array<IShape> = [];

    for (const outgoingElement of outgoingElementsAsIModdleElement) {
      const outgoingElementAsShape: IShape = this._elementRegistry.get(outgoingElement.id);
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

  public getCallActivities(): Array<IShape> {
    const callActivities: Array<IShape> = this._elementRegistry.filter((element: IShape): boolean => {
      return element.type === 'bpmn:CallActivity';
    });

    return callActivities;
  }

  public async getActiveCallActivities(processInstanceId: string): Promise<Array<IShape>> {
    const activeTokens: Array<ActiveToken> = await this._liveExecutionTrackerRepository.getActiveTokensForProcessInstance(processInstanceId);

    const callActivities: Array<IShape> = this.getCallActivities();

    const inactiveCallActivities: Array<IShape> = callActivities.filter((callActivity: IShape) => {
      return this.elementHasActiveToken(callActivity.id, activeTokens);
    });

    return inactiveCallActivities;
  }

  public async getInactiveCallActivities(processInstanceId: string): Promise<Array<IShape>> {
    const activeTokens: Array<ActiveToken> = await this._liveExecutionTrackerRepository.getActiveTokensForProcessInstance(processInstanceId);

    const callActivities: Array<IShape> = this.getCallActivities();

    const inactiveCallActivities: Array<IShape> = callActivities.filter((callActivity: IShape) => {
      return !this.elementHasActiveToken(callActivity.id, activeTokens);
    });

    return inactiveCallActivities;
  }

  public async getProcessModelByProcessInstanceId(correlationId: string,
                                                  processInstanceId: string): Promise<DataModels.Correlations.CorrelationProcessInstance> {

    const correlation: DataModels.Correlations.Correlation = await  this.getCorrelationById(correlationId);

    const errorGettingCorrelation: boolean = correlation === undefined;
    if (errorGettingCorrelation) {
      return undefined;
    }

    const processModel: DataModels.Correlations.CorrelationProcessInstance =
      correlation.processInstances.find((correlationProcessInstance: DataModels.Correlations.CorrelationProcessInstance): boolean => {
        const processModelFound: boolean = correlationProcessInstance.processInstanceId === processInstanceId;

        return processModelFound;
      });

    return processModel;
  }

  public getElementById(elementId: string): IShape {
    return this._elementRegistry.get(elementId);
  }

  public async getProcessInstanceIdOfCallActivityTarget(correlationId: string,
                                                        processInstanceIdOfOrigin: string,
                                                        callActivityTargetId: string): Promise<string> {

    const correlation: DataModels.Correlations.Correlation = await this.getCorrelationById(correlationId);

    const errorGettingCorrelation: boolean = correlation === undefined;
    if (errorGettingCorrelation) {
      return undefined;
    }

    const {processInstanceId} = correlation.processInstances
      .find((correlationProcessInstance: CorrelationProcessInstance): boolean => {
        const targetProcessModelFound: boolean = correlationProcessInstance.parentProcessInstanceId === processInstanceIdOfOrigin
                                              && correlationProcessInstance.processModelId === callActivityTargetId;

        return targetProcessModelFound;
      });

    return processInstanceId;
  }

  public async importXmlIntoDiagramModeler(xml: string): Promise<void> {
    const xmlImportPromise: Promise<void> = new Promise((resolve: Function, reject: Function): void => {
      this._diagramModeler.importXML(xml, (importXmlError: Error) => {
        if (importXmlError) {
          reject(importXmlError);

          return;
        }
        resolve();
      });
    });

    return xmlImportPromise;
  }

  public async exportXmlFromDiagramModeler(): Promise<string> {
    const saveXmlPromise: Promise<string> = new Promise((resolve: Function, reject: Function): void =>  {
      const xmlSaveOptions: IBpmnXmlSaveOptions = {
        format: true,
      };

      this._diagramModeler.saveXML(xmlSaveOptions, async(saveXmlError: Error, xml: string) => {
        if (saveXmlError) {
          reject(saveXmlError);

          return;
        }

        resolve(xml);
      });
    });

    return saveXmlPromise;
  }

  public clearDiagramColors(): void {
    const elementsWithColor: Array<IShape> = this._elementRegistry.filter((element: IShape): boolean => {
      const elementHasFillColor: boolean = element.businessObject.di.fill !== undefined;
      const elementHasBorderColor: boolean = element.businessObject.di.stroke !== undefined;

      const elementHasColor: boolean = elementHasFillColor || elementHasBorderColor;

      return elementHasColor;
    });

    const noElementsWithColor: boolean = elementsWithColor.length === 0;
    if (noElementsWithColor) {
      return;
    }

    this._modeling.setColor(elementsWithColor, {
      stroke: defaultBpmnColors.none.border,
      fill: defaultBpmnColors.none.fill,
    });
  }

  public async getColorizedXml(processInstanceId: string): Promise<string> {
    const elementsWithActiveToken: Array<IShape> = await this.getElementsWithActiveToken(processInstanceId);
    const elementsWithTokenHistory: Array<IShape> = await this.getElementsWithTokenHistory(processInstanceId);

    this._colorizeElements(elementsWithTokenHistory, defaultBpmnColors.green);
    this._colorizeElements(elementsWithActiveToken, defaultBpmnColors.orange);

    const colorizedXml: string = await this.exportXmlFromDiagramModeler();

    return colorizedXml;
  }

  public terminateProcess(processInstanceId: string): Promise<void> {
    return this._liveExecutionTrackerRepository.terminateProcess(processInstanceId);
  }

  private _colorizeElements(elements: Array<IShape>, color: IColorPickerColor): void {
    const noElementsToColorize: boolean = elements.length === 0;
    if (noElementsToColorize) {
      return;
    }

    this._modeling.setColor(elements, {
      stroke: color.border,
      fill: color.fill,
    });
  }
}
