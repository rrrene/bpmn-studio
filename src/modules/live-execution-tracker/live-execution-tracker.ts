import {bindable, computedFrom, inject, observable} from 'aurelia-framework';
import {Router} from 'aurelia-router';

import * as bundle from '@process-engine/bpmn-js-custom-bundle';

import {DataModels} from '@process-engine/management_api_contracts';

import {IModdleElement, IShape} from '@process-engine/bpmn-elements_contracts';
import {ActiveToken} from '@process-engine/kpi_api_contracts';
import {CorrelationProcessInstance} from '@process-engine/management_api_contracts/dist/data_models/correlation';
import {TokenHistoryEntry} from '@process-engine/management_api_contracts/dist/data_models/token_history';
import {IDiagram} from '@process-engine/solutionexplorer.contracts';

import {
  defaultBpmnColors,
  IBpmnModeler,
  IBpmnXmlSaveOptions,
  ICanvas,
  IColorPickerColor,
  IElementRegistry,
  IEvent,
  IEventFunction,
  IModeling,
  IOverlayManager,
  ISolutionEntry,
  ISolutionService,
  NotificationType,
} from '../../contracts/index';

import {NotificationService} from '../../services/notification-service/notification.service';
import {TaskDynamicUi} from '../task-dynamic-ui/task-dynamic-ui';
import {ILiveExecutionTrackerService} from './contracts/index';

type RouteParameters = {
  diagramName: string,
  solutionUri: string,
  correlationId: string,
  processInstanceId: string,
  taskId?: string,
};

@inject(Router, 'NotificationService', 'SolutionService', 'LiveExecutionTrackerService')
export class LiveExecutionTracker {
  public canvasModel: HTMLElement;
  public previewCanvasModel: HTMLElement;
  public showDynamicUiModal: boolean = false;
  public showDiagramPreviewViewer: boolean = false;
  public nameOfDiagramToPreview: string;
  public dynamicUi: TaskDynamicUi;
  public liveExecutionTracker: LiveExecutionTracker = this;
  public modalStyleString: string = 'position: relative; top: 20%; bottom: 20%; width: 400px; height: 60%;';
  public contentStyleString: string = 'height: auto;';

  @observable public tokenViewerWidth: number = 250;
  public tokenViewer: HTMLElement;
  public tokenViewerResizeDiv: HTMLElement;
  public showTokenViewer: boolean = false;

  @observable public activeSolutionEntry: ISolutionEntry;
  public activeDiagram: IDiagram;
  public selectedFlowNode: IShape;
  public correlation: DataModels.Correlations.Correlation;

  public correlationId: string;
  public processModelId: string;
  public processInstanceId: string;
  public taskId: string;

  private _diagramModeler: IBpmnModeler;
  private _diagramViewer: IBpmnModeler;
  private _diagramPreviewViewer: IBpmnModeler;
  private _modeling: IModeling;
  private _elementRegistry: IElementRegistry;
  private _viewerCanvas: ICanvas;
  private _overlays: IOverlayManager;

  private _router: Router;
  private _notificationService: NotificationService;
  private _solutionService: ISolutionService;

  private _pollingTimer: NodeJS.Timer;
  private _attached: boolean;
  private _activeTokens: Array<ActiveToken>;
  private _parentProcessInstanceId: string;
  private _parentProcessModelId: string;
  private _activeCallActivities: Array<IShape> = [];
  private _processStopped: boolean = false;

  private _elementsWithEventListeners: Array<string> = [];

  private _liveExecutionTrackerService: ILiveExecutionTrackerService;

  constructor(router: Router,
              notificationService: NotificationService,
              solutionService: ISolutionService,
              liveExecutionTrackerService: ILiveExecutionTrackerService) {

    this._router = router;
    this._notificationService = notificationService;
    this._solutionService = solutionService;
    this._liveExecutionTrackerService = liveExecutionTrackerService;
  }

  public async activate(routeParameters: RouteParameters): Promise<void> {
    this.correlationId = routeParameters.correlationId;
    this.processModelId = routeParameters.diagramName;

    this.activeSolutionEntry = await this._solutionService.getSolutionEntryForUri(routeParameters.solutionUri);
    this.activeSolutionEntry.service.openSolution(routeParameters.solutionUri, this.activeSolutionEntry.identity);

    this.processInstanceId = routeParameters.processInstanceId;

    this._parentProcessInstanceId = await this._getParentProcessInstanceId();
    this._parentProcessModelId = await this._getParentProcessModelId();

    this.correlation = await this._liveExecutionTrackerService.getCorrelationById(this.correlationId);

    // This is needed to make sure the SolutionExplorerService is completely initiated
    setTimeout(async() => {
      this.activeDiagram = await this.activeSolutionEntry.service.loadDiagram(this.processModelId);
    }, 0);
  }

  public async attached(): Promise<void> {
    this._attached = true;

    const processEndedCallback: Function = (): void => {
      this._handleElementColorization();

      this._processStopped = true;
      this._notificationService.showNotification(NotificationType.INFO, 'Process stopped.');
    };

    const taskReachedCallback: Function = (): void => {
      this._handleElementColorization();
    };

    const taskFinishedCallback: Function = (): void => {
      this._handleElementColorization();
    };

    const getProcessStopped: () => boolean = (): boolean => {
      return this._processStopped;
    };

    // Create Backend EventListeners
    this._liveExecutionTrackerService.createProcessEndedEventListener(this.correlationId, processEndedCallback);
    this._liveExecutionTrackerService.createProcessTerminatedEventListener(this.correlationId, processEndedCallback);

    this._liveExecutionTrackerService.createUserTaskWaitingEventListener(this.correlationId, getProcessStopped, taskReachedCallback);
    this._liveExecutionTrackerService.createUserTaskFinishedEventListener(this.correlationId, getProcessStopped, taskFinishedCallback);
    this._liveExecutionTrackerService.createManualTaskWaitingEventListener(this.correlationId, getProcessStopped, taskReachedCallback);
    this._liveExecutionTrackerService.createManualTaskFinishedEventListener(this.correlationId, getProcessStopped, taskFinishedCallback);
    this._liveExecutionTrackerService.createEmptyActivityWaitingEventListener(this.correlationId, getProcessStopped, taskReachedCallback);
    this._liveExecutionTrackerService.createEmptyActivityFinishedEventListener(this.correlationId, getProcessStopped, taskFinishedCallback);

    // Create Modeler & Viewer
    this._diagramModeler = new bundle.modeler();
    this._diagramViewer = new bundle.viewer({
      additionalModules:
        [
          bundle.ZoomScrollModule,
          bundle.MoveCanvasModule,
          bundle.MiniMap,
        ],
    });

    this._diagramPreviewViewer = new bundle.viewer({
      additionalModules:
      [
        bundle.ZoomScrollModule,
        bundle.MoveCanvasModule,
        bundle.MiniMap,
      ],
    });

    this._modeling = this._diagramModeler.get('modeling');
    this._elementRegistry = this._diagramModeler.get('elementRegistry');
    this._viewerCanvas = this._diagramViewer.get('canvas');
    this._overlays = this._diagramViewer.get('overlays');

    this._diagramViewer.attachTo(this.canvasModel);

    this._diagramViewer.on('element.click', this._elementClickHandler);
    this._viewerCanvas.zoom('fit-viewport', 'auto');

    // Prepare modeler
    const xml: string = await this._getXml();

    const couldNotGetXml: boolean = xml === undefined;
    if (couldNotGetXml) {
      return;
    }

    // Import the xml to the modeler to add colors to it
    await this._importXmlIntoDiagramModeler(xml);

    // Colorize xml & Add overlays
    /*
     * Remove all colors if the diagram has already colored elements.
     * For example, if the user has some elements colored orange and is running
     * the diagram, one would think in LiveExecutionTracker that the element is
     * active although it is not active.
    */
    this._clearDiagramColors();

    const colorizedXml: string = await this._getColorizedXml();

    const colorizingWasSuccessfull: boolean = colorizedXml !== undefined;
    if (colorizingWasSuccessfull) {
      await this._importXmlIntoDiagramViewer(colorizedXml);
    } else {
      const xmlFromModeler: string = await this._exportXmlFromDiagramModeler();

      await this._importXmlIntoDiagramViewer(xmlFromModeler);
    }

    await this._addOverlays();

    // Add EventListener for Resizing
    this.tokenViewerResizeDiv.addEventListener('mousedown', (mouseDownEvent: Event) => {
      const windowEvent: Event = mouseDownEvent || window.event;
      windowEvent.cancelBubble = true;

      const mousemoveFunction: IEventFunction = (mouseMoveEvent: MouseEvent): void => {
        this._resizeTokenViewer(mouseMoveEvent);
        document.getSelection().empty();
      };

      const mouseUpFunction: IEventFunction = (): void => {
        document.removeEventListener('mousemove', mousemoveFunction);
        document.removeEventListener('mouseup', mouseUpFunction);
      };

      document.addEventListener('mousemove', mousemoveFunction);
      document.addEventListener('mouseup', mouseUpFunction);
    });
  }

  public detached(): void {
    this._attached = false;

    this._diagramViewer.detach();
    this._diagramViewer.destroy();

    this._diagramPreviewViewer.destroy();

    this._stopPolling();
  }

  public determineActivationStrategy(): string {
    return 'replace';
  }

  public activeSolutionEntryChanged(): void {
    this._liveExecutionTrackerService.setIdentity(this.activeSolutionEntry.identity);
  }

  @computedFrom('_previousProcessModels.length')
  public get hasPreviousProcess(): boolean {
    return this._parentProcessModelId !== undefined;
  }

  public navigateBackToPreviousProcess(): void {
    this._router.navigateToRoute('live-execution-tracker', {
      correlationId: this.correlationId,
      diagramName: this._parentProcessModelId,
      solutionUri: this.activeSolutionEntry.uri,
      processInstanceId: this._parentProcessInstanceId,
    });
  }

  public closeDynamicUiModal(): void {
    this.showDynamicUiModal = false;

    this.dynamicUi.clearTasks();
  }

  public closeDiagramPreview(): void {
    this.showDiagramPreviewViewer = false;

    this._diagramPreviewViewer.clear();
    this._diagramPreviewViewer.detach();
  }

  public toggleShowTokenViewer(): void {
    this.showTokenViewer = !this.showTokenViewer;
  }

  public async stopProcessInstance(): Promise<void> {
    await this._managementApiClient.terminateProcessInstance(this.activeSolutionEntry.identity, this.processInstanceId);

    const xml: string = await this._colorizeXml();
    this._importXmlIntoDiagramViewer(xml);
  }

  public get processIsActive(): boolean {
    const processIsActive: boolean = Array.isArray(this._activeTokens) && this._activeTokens.length > 0;

    return processIsActive;
  }

  private async _getParentProcessModelId(): Promise<string> {
    const parentProcessInstanceIdNotFound: boolean = this._parentProcessInstanceId === undefined;
    if (parentProcessInstanceIdNotFound) {
      return undefined;
    }

    const parentProcessModel: DataModels.Correlations.CorrelationProcessInstance =
      await this._getProcessModelByProcessInstanceId(this._parentProcessInstanceId);

    const parentProcessModelNotFound: boolean = parentProcessModel === undefined;
    if (parentProcessModelNotFound) {
      return undefined;
    }

    return parentProcessModel.processModelId;
  }

  private async _colorizeXml(elementsWithTokenHistory: Array<IShape>, elementsWithActiveToken: Array<IShape>): Promise<string> {
    // Colorize the found elements and add overlay to those that can be started.
    this._colorizeElements(elementsWithTokenHistory, defaultBpmnColors.green);
    this._colorizeElements(elementsWithActiveToken, defaultBpmnColors.orange);

    // Export the colored xml from the modeler
    const colorizedXml: string = await this._exportXmlFromDiagramModeler();
    return colorizedXml;
  }

  private async _addOverlays(): Promise<void> {

    this._overlays.clear();

    const elementsThatCanHaveAToken: Array<IShape> = this._getAllElementsThatCanHaveAToken();
    const elementsWithActiveToken: Array<IShape> = await this._filterElementsWithActiveTokens(elementsThatCanHaveAToken);
    const inactiveCallActivities: Array<IShape> = this._filterInactveCallActivities(elementsThatCanHaveAToken);

    this._addOverlaysToUserAndManualTasks(elementsWithActiveToken);
    this._addOverlaysToEmptyActivities(elementsWithActiveToken);
    this._addOverlaysToActiveCallActivities(elementsWithActiveToken);
    this._addOverlaysToInactiveCallActivities(inactiveCallActivities);
  }

  private _getAllElementsThatCanHaveAToken(): Array<IShape> {
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

  private _filterInactveCallActivities(elements: Array<IShape>): Array<IShape> {
    const inactiveCallActivities: Array<IShape> = elements.filter((element: IShape): boolean => {
      const elementIsCallActivity: boolean = element.type === 'bpmn:CallActivity';

      return elementIsCallActivity && this._elementHasActiveToken(element.id);
    });

    return inactiveCallActivities;
  }

  private async _filterElementsWithActiveTokens(elements: Array<IShape>): Promise<Array<IShape>> {
    // Get all elements that already have an active token.
    const elementsWithActiveToken: Array<IShape> = await this._getElementsWithActiveToken(elements);

    // If the backend returned an error the diagram should not be rendered.
    const couldNotGetActiveTokens: boolean = elementsWithActiveToken === null;
    if (couldNotGetActiveTokens) {
      throw new Error('Could not get ActiveTokens.');
    }

    return elementsWithActiveToken;
  }

  private async _filterElementsWithTokenHistory(elements: Array<IShape>): Promise<Array<IShape>> {
    // Get all elements that already have a token.
    const elementsWithTokenHistory: Array<IShape> = await this._getElementsWithTokenHistory(elements);

    // If the backend returned an error the diagram should not be rendered.
    const couldNotGetTokenHistory: boolean = elementsWithTokenHistory === null;
    if (couldNotGetTokenHistory) {
      throw new Error('Could not get TokenHistories.');
    }

    return elementsWithTokenHistory;
  }

  private _addOverlaysToEmptyActivities(elements: Array<IShape>): Array<string> {
    const liveExecutionTrackerIsNotAttached: boolean = !this._attached;
    if (liveExecutionTrackerIsNotAttached) {
      return [];
    }

    const activeEmptyActivities: Array<IShape> = elements.filter((element: IShape) => {
      const elementIsEmptyActivity: boolean = element.type === 'bpmn:Task';

      return elementIsEmptyActivity;
    });

    const activeEmptyActivitiesIds: Array<string> = activeEmptyActivities.map((element: IShape) => element.id).sort();

    for (const elementId of this._elementsWithEventListeners) {
      document.getElementById(elementId).removeEventListener('click', this._handleEmptyActivityClick);
    }

    for (const callActivity of this._activeCallActivities) {
      document.getElementById(callActivity.id).removeEventListener('click', this._handleActiveCallActivityClick);
    }

    this._elementsWithEventListeners = [];

    for (const element of activeEmptyActivities) {
      this._overlays.add(element, {
        position: {
          left: 30,
          top: 25,
        },
        html: `<div class="let__overlay-button" id="${element.id}"><i class="fas fa-play let__overlay-button-icon overlay__empty-task"></i></div>`,
      });

      document.getElementById(element.id).addEventListener('click', this._handleEmptyActivityClick);

      this._elementsWithEventListeners.push(element.id);
    }

    return activeEmptyActivitiesIds;
  }

  private _addOverlaysToUserAndManualTasks(elements: Array<IShape>): Array<string> {
    const liveExecutionTrackerIsNotAttached: boolean = !this._attached;
    if (liveExecutionTrackerIsNotAttached) {
      return [];
    }

    const activeManualAndUserTasks: Array<IShape> = elements.filter((element: IShape) => {
      const elementIsAUserOrManualTask: boolean = element.type === 'bpmn:UserTask'
                                               || element.type === 'bpmn:ManualTask';

      return elementIsAUserOrManualTask;
    });

    const activeManualAndUserTaskIds: Array<string> = activeManualAndUserTasks.map((element: IShape) => element.id).sort();

    for (const elementId of this._elementsWithEventListeners) {
      document.getElementById(elementId).removeEventListener('click', this._handleTaskClick);
    }

    for (const callActivity of this._activeCallActivities) {
      document.getElementById(callActivity.id).removeEventListener('click', this._handleActiveCallActivityClick);
    }

    this._elementsWithEventListeners = [];

    for (const element of activeManualAndUserTasks) {
      this._overlays.add(element, {
        position: {
          left: 30,
          top: 25,
        },
        html: `<div class="let__overlay-button" id="${element.id}"><i class="fas fa-play let__overlay-button-icon"></i></div>`,
      });

      document.getElementById(element.id).addEventListener('click', this._handleTaskClick);

      this._elementsWithEventListeners.push(element.id);
    }

    return activeManualAndUserTaskIds;
  }

  private _addOverlaysToInactiveCallActivities(callActivities: Array<IShape>): void {
    const liveExecutionTrackerIsNotAttached: boolean = !this._attached;
    if (liveExecutionTrackerIsNotAttached) {
      return;
    }

    const callActivityIds: Array<string> = callActivities.map((element: IShape) => element.id).sort();

    const overlayIds: Array<string> = Object.keys(this._overlays._overlays);
    const allCallActivitiesHaveAnOverlay: boolean = callActivityIds.every((callActivityId: string): boolean => {
      const overlayFound: boolean = overlayIds.find((overlayId: string): boolean => {
        return this._overlays._overlays[overlayId].element.id === callActivityId;
      }) !== undefined;

      return overlayFound;
     });

    if (allCallActivitiesHaveAnOverlay) {
      return;
    }

    for (const element of callActivities) {
      this._overlays.add(element, {
        position: {
          left: 30,
          top: 25,
        },
        html: `<div class="let__overlay-button" id="${element.id}"><i class="fas fa-search let__overlay-button-icon"></i></div>`,
      });

      document.getElementById(element.id).addEventListener('click', this._handleCallActivityClick);

      this._elementsWithEventListeners.push(element.id);
    }
  }

  private _addOverlaysToActiveCallActivities(activeElements: Array<IShape>): Array<string> {
    const liveExecutionTrackerIsNotAttached: boolean = !this._attached;
    if (liveExecutionTrackerIsNotAttached) {
      return [];
    }

    const activeCallActivities: Array<IShape> = activeElements.filter((element: IShape) => {
      const elementIsCallActivity: boolean = element.type === 'bpmn:CallActivity';

      return elementIsCallActivity;
    });

    const activeCallActivityIds: Array<string> = activeCallActivities.map((element: IShape) => element.id).sort();

    this._activeCallActivities = activeCallActivities;

    for (const element of activeCallActivities) {
      this._overlays.add(element, {
        position: {
          left: 30,
          top: 25,
        },
        html: `<div class="let__overlay-button" id="${element.id}"><i class="fas fa-external-link-square-alt let__overlay-button-icon"></i></div>`,
      });

      document.getElementById(element.id).addEventListener('click', this._handleActiveCallActivityClick);

      this._elementsWithEventListeners.push(element.id);
    }

    return activeCallActivityIds;
  }

  private _handleTaskClick: (event: MouseEvent) => void =
    (event: MouseEvent): void => {
      const elementId: string = (event.target as HTMLDivElement).id;
      this.taskId = elementId;
      this.showDynamicUiModal = true;
    }

  private _handleEmptyActivityClick: (event: MouseEvent) => void =
    async(event: MouseEvent): Promise<void> => {
      const elementId: string = (event.target as HTMLDivElement).id;
      this.taskId = elementId;

      const emptyActivitiesInProcessInstance: DataModels.EmptyActivities.EmptyActivityList =
        await this._liveExecutionTrackerService.getEmptyActivitiesForProcessInstance(this.processInstanceId);

      const emptyActivity: DataModels.EmptyActivities.EmptyActivity =
        emptyActivitiesInProcessInstance.emptyActivities.find((activity: DataModels.EmptyActivities.EmptyActivity) => {
          return activity.id === this.taskId;
      });

      this._liveExecutionTrackerService.finishEmptyActivity(this.processInstanceId, this.correlationId, emptyActivity);
    }

  private _handleActiveCallActivityClick: (event: MouseEvent) => Promise<void> =
    async(event: MouseEvent): Promise<void> => {
      const elementId: string = (event.target as HTMLDivElement).id;
      const element: IShape = this._elementRegistry.get(elementId);
      const callActivityTargetProcess: string = element.businessObject.calledElement;

      const callAcitivityHasNoTargetProcess: boolean = callActivityTargetProcess === undefined;
      if (callAcitivityHasNoTargetProcess) {
        const notificationMessage: string = 'The CallActivity has no target configured. Please configure a target in the designer.';

        this._notificationService.showNotification(NotificationType.INFO, notificationMessage);
      }

      const targetProcessInstanceId: string = await this._getProcessInstanceIdOfCallActivityTarget(callActivityTargetProcess);

      const errorGettingTargetProcessInstanceId: boolean = targetProcessInstanceId === undefined;
      if (errorGettingTargetProcessInstanceId) {
        return;
      }

      this._router.navigateToRoute('live-execution-tracker', {
        diagramName: callActivityTargetProcess,
        solutionUri: this.activeSolutionEntry.uri,
        correlationId: this.correlationId,
        processInstanceId: targetProcessInstanceId,
      });
    }

    private _handleCallActivityClick: (event: MouseEvent) => Promise<void> =
    async(event: MouseEvent): Promise<void> => {
      const elementId: string = (event.target as HTMLDivElement).id;
      const element: IShape = this._elementRegistry.get(elementId);
      const callActivityTargetProcess: string = element.businessObject.calledElement;

      const callActivityHasNoTargetProcess: boolean = callActivityTargetProcess === undefined;
      if (callActivityHasNoTargetProcess) {
        const notificationMessage: string = 'The CallActivity has no target configured. Please configure a target in the designer.';

        this._notificationService.showNotification(NotificationType.INFO, notificationMessage);
      }

      const xml: string = await this._getXmlByProcessModelId(callActivityTargetProcess);
      await this._importXmlIntoDiagramPreviewViewer(xml);

      this.nameOfDiagramToPreview = callActivityTargetProcess;
      this.showDiagramPreviewViewer = true;

      setTimeout(() => {
        this._diagramPreviewViewer.attachTo(this.previewCanvasModel);
      }, 0);
    }

  private async _getXmlByProcessModelId(processModelId: string): Promise<string> {
    const processModel: DataModels.ProcessModels.ProcessModel = await this._liveExecutionTrackerService.getProcessModelById(processModelId);

    return processModel.xml;
  }

  private async _getProcessInstanceIdOfCallActivityTarget(callActivityTargetId: string): Promise<string> {
    const correlation: DataModels.Correlations.Correlation = await this._liveExecutionTrackerService.getCorrelationById(this.correlationId);

    const errorGettingCorrelation: boolean = correlation === undefined;
    if (errorGettingCorrelation) {
      const notificationMessage: string = 'Could not get correlation. Please try to click on the call activity again.';

      this._notificationService.showNotification(NotificationType.ERROR, notificationMessage);

      return undefined;
    }

    const callActivityTarget: CorrelationProcessInstance = correlation.processInstances
      .find((correlationProcessModel: CorrelationProcessInstance): boolean => {
        const targetProcessModelFound: boolean = correlationProcessModel.parentProcessInstanceId === this.processInstanceId
          && correlationProcessModel.processModelId === callActivityTargetId;

        return targetProcessModelFound;
      });

    return callActivityTarget.processInstanceId;
  }

  private _elementClickHandler: (event: IEvent) => Promise<void> = async(event: IEvent) => {
    const clickedElement: IShape = event.element;

    this.selectedFlowNode = event.element;

    const clickedElementIsNotAUserOrManualTask: boolean = clickedElement.type !== 'bpmn:UserTask'
                                                       && clickedElement.type !== 'bpmn:ManualTask';

    if (clickedElementIsNotAUserOrManualTask) {
      return;
    }

    const elementHasNoActiveToken: boolean = !this._hasElementActiveToken(clickedElement.id);
    if (elementHasNoActiveToken) {
      return;
    }

    this.taskId = clickedElement.id;
  }

  private _hasElementActiveToken(elementId: string): boolean {
    const activeTokenForFlowNodeInstance: ActiveToken = this._activeTokens.find((activeToken: ActiveToken) => {
      const activeTokenIsFromFlowNodeInstance: boolean = activeToken.flowNodeId === elementId;

      return activeTokenIsFromFlowNodeInstance;
    });

    return activeTokenForFlowNodeInstance !== undefined;
  }

  private async _getElementsWithActiveToken(elements: Array<IShape>): Promise<Array<IShape> | null> {
    const activeTokens: Array<ActiveToken> | null = await this._liveExecutionTrackerService.getActiveTokensForProcessInstance(this.processInstanceId);

    const couldNotGetActiveTokens: boolean = activeTokens === null;
    if (couldNotGetActiveTokens) {
      return null;
    }

    this._activeTokens = activeTokens;
    const elementsWithActiveToken: Array<IShape> = this._activeTokens.map((activeToken: ActiveToken): IShape => {
      const elementWithActiveToken: IShape = elements.find((element: IShape) => {
        return element.id === activeToken.flowNodeId;
      });

      return elementWithActiveToken;
    });

    return elementsWithActiveToken;
  }

  private async _getElementsWithTokenHistory(elements: Array<IShape>): Promise<Array<IShape> | null> {

    const tokenHistoryGroups: DataModels.TokenHistory.TokenHistoryGroup =
      await this._liveExecutionTrackerService.getTokenHistoryGroupForProcessInstance(this.processInstanceId);

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
        const elementWithOutgoingElements: Array<IShape> = this._getElementWithOutgoingElements(elementFromTokenHistory, tokenHistoryGroups);

        elementsWithTokenHistory.push(...elementWithOutgoingElements);
      }
    }

    return elementsWithTokenHistory;
  }

  private _getElementWithOutgoingElements(element: IShape,
                                          tokenHistoryGroups: DataModels.TokenHistory.TokenHistoryGroup): Array<IShape> {

    const outgoingElementsAsIModdleElement: Array<IModdleElement> = element.businessObject.outgoing;

   /*
    * If the element has no outgoing source just return the element.
    */
    const elementHasOutgoingElements: boolean = outgoingElementsAsIModdleElement === undefined;
    if (elementHasOutgoingElements) {
      return [element];
    }

    const elementsWithOutgoingElements: Array<IShape> = [element];

    for (const outgoingElement of outgoingElementsAsIModdleElement) {
      const outgoingElementAsShape: IShape = this._elementRegistry.get(outgoingElement.id);
      const targetOfOutgoingElement: IShape = outgoingElementAsShape.target;

      const outgoingElementHasNoTarget: boolean = targetOfOutgoingElement === undefined;
      if (outgoingElementHasNoTarget) {
        continue;
      }

      const outgoingElementHasNoActiveToken: boolean = !this._elementHasActiveToken(targetOfOutgoingElement.id);
      const targetOfOutgoingElementHasNoTokenHistory: boolean = !this._elementHasTokenHistory(targetOfOutgoingElement.id, tokenHistoryGroups);

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

        const needToAddToOutgoingElements: boolean  = sequenceFlowWasExecuted || targetOfOutgoingElementIsGateway;
        if (needToAddToOutgoingElements) {
          elementsWithOutgoingElements.push(outgoingElementAsShape);
        }

        continue;
      }

      elementsWithOutgoingElements.push(outgoingElementAsShape);
    }

    return elementsWithOutgoingElements;
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

  private _elementHasTokenHistory(elementId: string, tokenHistoryGroups: DataModels.TokenHistory.TokenHistoryGroup): boolean {

    const tokenHistoryFromFlowNodeInstanceFound: boolean = tokenHistoryGroups[elementId] !== undefined;

    return tokenHistoryFromFlowNodeInstanceFound;
  }

  private _elementHasActiveToken(elementId: string): boolean {
    const activeTokenForFlowNodeInstance: ActiveToken = this._activeTokens.find((activeToken: ActiveToken) => {
      const activeTokenIsFromFlowNodeInstance: boolean = activeToken.flowNodeId === elementId;

      return activeTokenIsFromFlowNodeInstance;
    });

    return activeTokenForFlowNodeInstance !== undefined;
  }

  private async _getXml(): Promise<string> {
    const correlation: DataModels.Correlations.Correlation = await this._liveExecutionTrackerService.getCorrelationById(this.correlationId);

    const errorGettingCorrelation: boolean = correlation === undefined;
    if (errorGettingCorrelation) {
      this._notificationService.showNotification(NotificationType.ERROR, 'Could not get correlation. Please try to start the process again.');

      return;
    }

    const processModelFromCorrelation: DataModels.Correlations.CorrelationProcessInstance =
      correlation.processInstances.find((processModel: DataModels.Correlations.CorrelationProcessInstance) => {
        const processModelIsSearchedProcessModel: boolean = processModel.processInstanceId === this.processInstanceId;

        return processModelIsSearchedProcessModel;
      });

    const xmlFromProcessModel: string = processModelFromCorrelation.xml;

    return xmlFromProcessModel;
  }

  private _clearDiagramColors(): void {
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

  private async _importXmlIntoDiagramViewer(xml: string): Promise<void> {
    const xmlIsNotLoaded: boolean = (xml === undefined || xml === null);

    if (xmlIsNotLoaded) {
      const notificationMessage: string = 'The xml could not be loaded. Please try to start the process again.';

      this._notificationService.showNotification(NotificationType.ERROR, notificationMessage);

      return;
    }

    const xmlImportPromise: Promise<void> = new Promise((resolve: Function, reject: Function): void => {
      this._diagramViewer.importXML(xml, (importXmlError: Error) => {
        if (importXmlError) {
          reject(importXmlError);

          return;
        }
        resolve();
      });
    });

    return xmlImportPromise;
  }

  private async _importXmlIntoDiagramPreviewViewer(xml: string): Promise<void> {
    const xmlIsNotLoaded: boolean = (xml === undefined || xml === null);

    if (xmlIsNotLoaded) {
      const notificationMessage: string = 'The xml could not be loaded. Please try to start the process again.';

      this._notificationService.showNotification(NotificationType.ERROR, notificationMessage);

      return;
    }

    const xmlImportPromise: Promise<void> = new Promise((resolve: Function, reject: Function): void => {
      this._diagramPreviewViewer.importXML(xml, (importXmlError: Error) => {
        if (importXmlError) {
          reject(importXmlError);

          return;
        }
        resolve();
      });
    });

    return xmlImportPromise;
  }

  private async _importXmlIntoDiagramModeler(xml: string): Promise<void> {
    const xmlIsNotLoaded: boolean = (xml === undefined || xml === null);

    if (xmlIsNotLoaded) {
      const notificationMessage: string = 'The xml could not be loaded. Please try to start the process again.';

      this._notificationService.showNotification(NotificationType.ERROR, notificationMessage);

      return;
    }

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

  private async _exportXmlFromDiagramModeler(): Promise<string> {
    const saveXmlPromise: Promise<string> = new Promise((resolve: Function, reject: Function): void => {
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

  private async _exportXmlFromDiagramViewer(): Promise<string> {
    const saveXmlPromise: Promise<string> = new Promise((resolve: Function, reject: Function): void => {
      const xmlSaveOptions: IBpmnXmlSaveOptions = {
        format: true,
      };

      this._diagramViewer.saveXML(xmlSaveOptions, async(saveXmlError: Error, xml: string) => {
        if (saveXmlError) {
          reject(saveXmlError);

          return;
        }

        resolve(xml);
      });
    });

    return saveXmlPromise;
  }

  private async _getColorizedXml(): Promise<string> {
    const elementsThatCanHaveAToken: Array<IShape> = this._getAllElementsThatCanHaveAToken();
    const elementsWithActiveToken: Array<IShape> = await this._filterElementsWithActiveTokens(elementsThatCanHaveAToken);
    const elementsWithTokenHistory: Array<IShape> = await this._filterElementsWithTokenHistory(elementsThatCanHaveAToken);

    const colorizedXml: string = await (async(): Promise<string> => {
      try {
        return await this._colorizeXml(elementsWithTokenHistory, elementsWithActiveToken);
      } catch {
        return undefined;
      }
    })();

    const colorizingFailed: boolean = colorizedXml === undefined;
    if (colorizingFailed) {
      const notificationMessage: string = 'Could not get tokens. If the error persists, '
                                        + 'try reopening the Live Execution Tracker or restarting the process.';

      this._notificationService.showNotification(NotificationType.ERROR, notificationMessage);

      return;
    }

    return colorizedXml;
  }

  private async _handleElementColorization(): Promise<void> {
    const previousXml: string = await this._exportXmlFromDiagramViewer();

    const colorizedXml: string = await this._getColorizedXml();

    const colorizingWasSuccessfull: boolean = colorizedXml !== undefined;
    const xmlChanged: boolean = previousXml !== colorizedXml;
    if (xmlChanged && colorizingWasSuccessfull) {
      await this._importXmlIntoDiagramViewer(colorizedXml);
    }

    await this._addOverlays();
  }

  private _stopPolling(): void {
    clearTimeout(this._pollingTimer);
  }

  private async _getParentProcessInstanceId(): Promise<string> {

    const correlation: DataModels.Correlations.Correlation = await this._liveExecutionTrackerService.getCorrelationById(this.correlationId);

    const errorGettingCorrelation: boolean = correlation === undefined;
    if (errorGettingCorrelation) {
      return undefined;
    }

    const processModelFromCorrelation: DataModels.Correlations.CorrelationProcessInstance = correlation.processInstances
      .find((correlationProcessModel: DataModels.Correlations.CorrelationProcessInstance): boolean => {
        const processModelFound: boolean = correlationProcessModel.processInstanceId === this.processInstanceId;

        return processModelFound;
      });

    const {parentProcessInstanceId} = processModelFromCorrelation;

    return parentProcessInstanceId;
  }

  private async _getProcessModelByProcessInstanceId(processInstanceId: string): Promise<DataModels.Correlations.CorrelationProcessModel> {
    const correlation: DataModels.Correlations.Correlation = await  this._liveExecutionTrackerService.getCorrelationById(this.correlationId);

    const errorGettingCorrelation: boolean = correlation === undefined;
    if (errorGettingCorrelation) {
      this._notificationService.showNotification(NotificationType.ERROR, 'Could not get correlation. Please try to start the process again.');

      return undefined;
    }

    const processModel: DataModels.Correlations.CorrelationProcessInstance =
      correlation.processInstances.find((correlationProcessModel: DataModels.Correlations.CorrelationProcessInstance): boolean => {
        const processModelFound: boolean = correlationProcessModel.processInstanceId === processInstanceId;

        return processModelFound;
      });

    return processModel;
  }

  private _resizeTokenViewer(mouseEvent: MouseEvent): void {
    const mouseXPosition: number = mouseEvent.clientX;

    const inspectCorrelation: HTMLElement = this.tokenViewer.parentElement;
    const minSpaceForDiagramViewer: number = 320;

    const windowWidth: number = window.innerWidth;
    const rightToolbarWidth: number = 36;

    const minTokenViewerWidth: number = 250;
    const maxTokenViewerWidth: number = inspectCorrelation.clientWidth - minSpaceForDiagramViewer;

    const newTokenViewerWidth: number = windowWidth - mouseXPosition - rightToolbarWidth;

    /*
     * This sets the new width of the token viewer to the minimum or maximum width,
     * if the new width is smaller than the minimum or bigger than the maximum width.
     */
    this.tokenViewerWidth = Math.min(maxTokenViewerWidth, Math.max(newTokenViewerWidth, minTokenViewerWidth));
  }
}
