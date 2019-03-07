import {computedFrom, inject, observable} from 'aurelia-framework';
import {Router} from 'aurelia-router';

import * as bundle from '@process-engine/bpmn-js-custom-bundle';

import {DataModels, IManagementApi} from '@process-engine/management_api_contracts';

import {IModdleElement, IShape} from '@process-engine/bpmn-elements_contracts';
import {ActiveToken} from '@process-engine/kpi_api_contracts';
import {CorrelationProcessInstance} from '@process-engine/management_api_contracts/dist/data_models/correlation';
import {TokenHistoryEntry} from '@process-engine/management_api_contracts/dist/data_models/token_history';
import {EndEventReachedMessage, TerminateEndEventReachedMessage} from '@process-engine/management_api_contracts/dist/messages/bpmn_events';
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
import environment from '../../environment';
import {NotificationService} from '../../services/notification-service/notification.service';
import {TaskDynamicUi} from '../task-dynamic-ui/task-dynamic-ui';

type RouteParameters = {
  diagramName: string,
  solutionUri: string,
  correlationId: string,
  processInstanceId: string,
  taskId?: string,
};

enum RequestError {
  ConnectionLost = 'connectionLost',
  OtherError = 'otherError',
}

@inject(Router, 'NotificationService', 'ManagementApiClientService', 'SolutionService')
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

  public activeSolutionEntry: ISolutionEntry;
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
  private _managementApiClient: IManagementApi;
  private _solutionService: ISolutionService;

  private _pollingTimer: NodeJS.Timer;
  private _attached: boolean;
  private _previousManualAndUserTaskIdsWithActiveToken: Array<string> = [];
  private _previousCallActivitiesWithActiveToken: Array<string> = [];
  private _previousEmptyTasksWithActiveToken: Array<string> = [];
  private _activeTokens: Array<ActiveToken>;
  private _parentProcessInstanceId: string;
  private _parentProcessModelId: string;
  private _maxRetries: number = 5;
  private _activeCallActivities: Array<IShape> = [];
  private _processStopped: boolean = false;

  private _elementsWithEventListeners: Array<string> = [];

  constructor(router: Router,
              notificationService: NotificationService,
              managementApiClient: IManagementApi,
              solutionService: ISolutionService) {

    this._router = router;
    this._notificationService = notificationService;
    this._managementApiClient = managementApiClient;
    this._solutionService = solutionService;
  }

  public async activate(routeParameters: RouteParameters): Promise<void> {
    this.correlationId = routeParameters.correlationId;
    this.processModelId = routeParameters.diagramName;

    this.activeSolutionEntry = await this._solutionService.getSolutionEntryForUri(routeParameters.solutionUri);
    this.activeSolutionEntry.service.openSolution(routeParameters.solutionUri, this.activeSolutionEntry.identity);

    this.processInstanceId = routeParameters.processInstanceId;

    this._parentProcessInstanceId = await this._getParentProcessInstanceId();
    this._parentProcessModelId = await this._getParentProcessModelId();

    const routeParameterContainTaskId: boolean = routeParameters.taskId !== undefined
                                              && routeParameters.taskId !== null
                                              && routeParameters.taskId !== '';

    if (routeParameterContainTaskId) {
      this.taskId = routeParameters.taskId;
      this.showDynamicUiModal = true;
    }

    this.correlation = await this._managementApiClient.getCorrelationById(this.activeSolutionEntry.identity, this.correlationId);

    // This is needed to make sure the SolutionExplorerService is completely initiated
    setTimeout(async() => {
      this.activeDiagram = await this.activeSolutionEntry.service.loadDiagram(this.processModelId);
    }, 0);
  }

  public async attached(): Promise<void> {
    this._attached = true;

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

    const xml: string = await this._getXml();

    const couldNotGetXml: boolean = xml === undefined;
    if (couldNotGetXml) {
      return;
    }

    // Import the xml to the modeler to add colors to it
    await this._importXmlIntoDiagramModeler(xml);

    /*
     * Remove all colors if the diagram has already colored elements.
     * For example, if the user has some elements colored orange and is running
     * the diagram, one would think in LiveExecutionTracker that the element is
     * active although it is not active.
    */
    this._clearColors();

    const colorizedXml: string = await (async(): Promise<string> => {
      try {
        return await this._colorizeXml();
      } catch {
        return undefined;
      }
    })();

    const colorizingFailed: boolean = colorizedXml === undefined;
    if (colorizingFailed) {
      const notificationMessage: string = 'Could not get tokens. '
                                        + 'Please try reopening the Live Execution Tracker or restarting the process.';

      this._notificationService.showNotification(NotificationType.ERROR, notificationMessage);

      return;
    }

    await this._importXmlIntoDiagramViewer(colorizedXml);

    this._diagramViewer.on('element.click', this._elementClickHandler);

    this._viewerCanvas.zoom('fit-viewport', 'auto');

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

    this._startPolling();
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

  private async _colorizeXml(): Promise<string> {
    // Get all elements that can have a token
    const allElements: Array<IShape> = this._elementRegistry.filter((element: IShape): boolean => {
      const elementCanHaveAToken: boolean = element.type !== 'bpmn:SequenceFlow'
                                         && element.type !== 'bpmn:Collaboration'
                                         && element.type !== 'bpmn:Participant'
                                         && element.type !== 'bpmn:Lane'
                                         && element.type !== 'label';

      return elementCanHaveAToken;
    });

    // Get all elements that already have an active token.
    const elementsWithActiveToken: Array<IShape> = await this._getElementsWithActiveToken(allElements);

    // If the backend returned an error the diagram should not be rendered.
    const couldNotGetActiveTokens: boolean = elementsWithActiveToken === null;
    if (couldNotGetActiveTokens) {
      throw new Error('Could not get ActiveTokens.');
    }

    // Get all elements that already have a token.
    const elementsWithTokenHistory: Array<IShape> = await this._getElementsWithTokenHistory(allElements);

    // If the backend returned an error the diagram should not be rendered.
    const couldNotGetTokenHistory: boolean = elementsWithTokenHistory === null;
    if (couldNotGetTokenHistory) {
      throw new Error('Could not get TokenHistories.');
    }

    // Colorize the found elements and add overlay to those that can be started.
    this._colorizeElements(elementsWithTokenHistory, defaultBpmnColors.green);
    this._colorizeElements(elementsWithActiveToken, defaultBpmnColors.orange);

    const activeUserAndManualTaskIds: Array<string> = this._addOverlaysToUserAndManualTasks(elementsWithActiveToken);
    const activeEmptyTaskIds: Array<string> =  this._addOverlaysToEmptyTasks(elementsWithActiveToken);
    const activeCallActivityIds: Array<string> = this._addOverlaysToActiveCallActivities(elementsWithActiveToken);

    this._addOverlaysToInactiveCallActivities(allElements);

    this._previousManualAndUserTaskIdsWithActiveToken = activeUserAndManualTaskIds;
    this._previousCallActivitiesWithActiveToken = activeCallActivityIds;
    this._previousEmptyTasksWithActiveToken = activeEmptyTaskIds;

    // Export the colored xml from the modeler
    const colorizedXml: string = await this._exportXmlFromDiagramModeler();
    return colorizedXml;
  }

  private _addOverlaysToEmptyTasks(elements: Array<IShape>): Array<string> {
    const liveExecutionTrackerIsNotAttached: boolean = !this._attached;
    if (liveExecutionTrackerIsNotAttached) {
      return [];
    }

    const activeEmptyTasks: Array<IShape> = elements.filter((element: IShape) => {
      const elementIsEmptyTask: boolean = element.type === 'bpmn:Task';

      return elementIsEmptyTask;
    });

    const activeEmptyTaskIds: Array<string> = activeEmptyTasks.map((element: IShape) => element.id).sort();

    const elementsWithActiveTokenDidNotChange: boolean =
      activeEmptyTaskIds.toString() === this._previousEmptyTasksWithActiveToken.toString();

    const overlayIds: Array<string> = Object.keys(this._overlays._overlays);

    const allActiveElementsHaveAnOverlay: boolean = activeEmptyTaskIds.every((taskId: string): boolean => {
      const overlayFound: boolean = overlayIds.find((overlayId: string): boolean => {
        return this._overlays._overlays[overlayId].element.id === taskId;
      }) !== undefined;

      return overlayFound;
    });

    if (elementsWithActiveTokenDidNotChange && allActiveElementsHaveAnOverlay) {
      return activeEmptyTaskIds;
    }

    for (const elementId of this._elementsWithEventListeners) {
      document.getElementById(elementId).removeEventListener('click', this._handleEmptyTaskClick);
    }

    for (const callActivity of this._activeCallActivities) {
      document.getElementById(callActivity.id).removeEventListener('click', this._handleActiveCallActivityClick);
    }

    this._elementsWithEventListeners = [];

    for (const element of activeEmptyTasks) {
      this._overlays.add(element, {
        position: {
          left: 30,
          top: 25,
        },
        html: `<div class="let__overlay-button" id="${element.id}"><i class="fas fa-play let__overlay-button-icon overlay__empty-task"></i></div>`,
      });

      document.getElementById(element.id).addEventListener('click', this._handleEmptyTaskClick);

      this._elementsWithEventListeners.push(element.id);
    }

    return activeEmptyTaskIds;
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

    const elementsWithActiveTokenDidNotChange: boolean =
      activeManualAndUserTaskIds.toString() === this._previousManualAndUserTaskIdsWithActiveToken.toString();

    const overlayIds: Array<string> = Object.keys(this._overlays._overlays);

    const allActiveElementsHaveAnOverlay: boolean = activeManualAndUserTaskIds.every((taskId: string): boolean => {
      const overlayFound: boolean = overlayIds.find((overlayId: string): boolean => {
        return this._overlays._overlays[overlayId].element.id === taskId;
      }) !== undefined;

      return overlayFound;
     });

    if (elementsWithActiveTokenDidNotChange && allActiveElementsHaveAnOverlay) {
      return activeManualAndUserTaskIds;
    }

    for (const elementId of this._elementsWithEventListeners) {
      document.getElementById(elementId).removeEventListener('click', this._handleTaskClick);
    }

    for (const callActivity of this._activeCallActivities) {
      document.getElementById(callActivity.id).removeEventListener('click', this._handleActiveCallActivityClick);
    }

    this._elementsWithEventListeners = [];
    this._overlays.clear();

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

  private _addOverlaysToInactiveCallActivities(elements: Array<IShape>): void {
    const liveExecutionTrackerIsNotAttached: boolean = !this._attached;
    if (liveExecutionTrackerIsNotAttached) {
      return;
    }

    const callActivities: Array<IShape> = elements.filter((element: IShape) => {
      const elementIsCallActivity: boolean = element.type === 'bpmn:CallActivity';

      return elementIsCallActivity;
    });

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
      if (this._elementHasActiveToken(element.id)) {
        continue;
      }

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

    const activeElementsWithActiveTokenDidNotChange: boolean =
      activeCallActivityIds.toString() === this._previousCallActivitiesWithActiveToken.toString();

    const overlayIds: Array<string> = Object.keys(this._overlays._overlays);
    const allActiveCallActivitiesHaveAnOverlay: boolean = activeCallActivityIds.every((callActivityId: string): boolean => {
      const overlayFound: boolean = overlayIds.find((overlayId: string): boolean => {
        return this._overlays._overlays[overlayId].element.id === callActivityId;
      }) !== undefined;

      return overlayFound;
     });

    if (activeElementsWithActiveTokenDidNotChange && allActiveCallActivitiesHaveAnOverlay) {
      return activeCallActivityIds;
    }

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

  private _handleEmptyTaskClick: (event: MouseEvent) => void =
    async(event: MouseEvent): Promise<void> => {
      const elementId: string = (event.target as HTMLDivElement).id;
      this.taskId = elementId;

      const emptyTasksInProcessInstance: DataModels.EmptyActivities.EmptyActivityList =
        await this._managementApiClient.getEmptyActivitiesForProcessInstance(this.activeSolutionEntry.identity, this.processInstanceId);

      const emptyTask: DataModels.EmptyActivities.EmptyActivity =
        emptyTasksInProcessInstance.emptyActivities.find((activity: DataModels.EmptyActivities.EmptyActivity) => {
          return activity.id === this.taskId;
      });

      this._managementApiClient.finishEmptyActivity(this.activeSolutionEntry.identity,
                                                    this.processInstanceId,
                                                    this.correlationId,
                                                    emptyTask.flowNodeInstanceId);
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
    const processModel: DataModels.ProcessModels.ProcessModel =
      await this._managementApiClient.getProcessModelById(this.activeSolutionEntry.identity, processModelId);

    return processModel.xml;
  }

  private async _getProcessInstanceIdOfCallActivityTarget(callActivityTargetId: string): Promise<string> {
    // This is necessary because the managementApi sometimes throws an error when the correlation is not yet existing.
    const getCorrelation: () => Promise<DataModels.Correlations.Correlation> = async(): Promise<DataModels.Correlations.Correlation> => {
      for (let retries: number = 0; retries < this._maxRetries; retries++) {
        try {
          return await this._managementApiClient.getCorrelationById(this.activeSolutionEntry.identity, this.correlationId);
        } catch {
          continue;
        }
      }

      const notificationMessage: string = 'Could not get correlation. Please try to click on the call activity again.';

      this._notificationService.showNotification(NotificationType.ERROR, notificationMessage);

      return undefined;
    };

    const correlation: DataModels.Correlations.Correlation = await getCorrelation();

    const errorGettingCorrelation: boolean = correlation === undefined;
    if (errorGettingCorrelation) {
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

    const getActiveTokens: Function = async(): Promise<Array<ActiveToken> | null> => {
      for (let retries: number = 0; retries < this._maxRetries; retries++) {
        try {
          return await this._managementApiClient.getActiveTokensForProcessInstance(this.activeSolutionEntry.identity, this.processInstanceId);
        } catch {
          continue;
        }
      }

      return null;
    };

    const activeTokens: Array<ActiveToken> | null = await getActiveTokens();

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

    const getTokenHistoryGroup: Function = async(): Promise<DataModels.TokenHistory.TokenHistoryGroup | null> => {
      for (let retries: number = 0; retries < this._maxRetries; retries++) {
        try {
          return await this._managementApiClient.getTokensForProcessInstance(this.activeSolutionEntry.identity, this.processInstanceId);
        } catch {
          continue;
        }
      }

      return null;
    };

    const tokenHistoryGroups: DataModels.TokenHistory.TokenHistoryGroup = await getTokenHistoryGroup();
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

    // This is necessary because the managementApi sometimes throws an error when the correlation is not yet existing.
    const getCorrelation: () => Promise<DataModels.Correlations.Correlation> = async(): Promise<DataModels.Correlations.Correlation> => {
      for (let retries: number = 0; retries < this._maxRetries; retries++) {
        try {
          return await this._managementApiClient.getCorrelationById(this.activeSolutionEntry.identity, this.correlationId);
        } catch {
          continue;
        }
      }

      this._notificationService.showNotification(NotificationType.ERROR, 'Could not get correlation. Please try to start the process again.');

      return undefined;
    };

    const correlation: DataModels.Correlations.Correlation = await getCorrelation();

    const errorGettingCorrelation: boolean = correlation === undefined;
    if (errorGettingCorrelation) {
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

  private _clearColors(): void {
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

  private async _startPolling(): Promise<void> {
    const handleElementColorization: Function = async(): Promise<void> => {
      const previousXml: string = await this._exportXmlFromDiagramViewer();
      const xml: string = await this._getXml();

      const couldNotGetXml: boolean = xml === undefined;
      if (couldNotGetXml) {
        const notificationMessage: string = 'XML could not be found. If the error persists, '
                                          + 'try reopening the Live Execution Tracker or restarting the process.';

        this._notificationService.showNotification(NotificationType.ERROR, notificationMessage);

        return;
      }

      const colorizedXml: string = await (async(): Promise<string> => {
        try {
          return await this._colorizeXml();
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

      const xmlChanged: boolean = previousXml !== colorizedXml;
      if (xmlChanged) {
        await this._importXmlIntoDiagramViewer(colorizedXml);
      }
    };

    this._pollingTimer = setTimeout(async() => {
      // Stop polling if not attached
      const notAttached: boolean = !this._attached;
      if (notAttached) {
        return;
      }

      const correlationIsStillActive: boolean | RequestError = await this._isCorrelationStillActive();

      const connectionLost: boolean = correlationIsStillActive === RequestError.ConnectionLost;
      const errorCheckingCorrelationState: boolean = correlationIsStillActive === RequestError.OtherError;

      // Keep polling if connectionLost
      if (connectionLost) {
        this._startPolling();

        return;
      }

      // Stop polling if checking the correlation state was not successfull
      if (errorCheckingCorrelationState) {
        const notificationMessage: string = 'Could not get active correlations. Please try to start the process again.';

        this._notificationService.showNotification(NotificationType.ERROR, notificationMessage);

        return;
      }

      await handleElementColorization();

      if (correlationIsStillActive && this._attached) {
        this._startPolling();
      } else {
        // Clear overlays after process stopped
        this._elementsWithEventListeners = [];
        this._overlays.clear();
      }
    }, environment.processengine.liveExecutionTrackerPollingIntervalInMs);
  }

  private _stopPolling(): void {
    clearTimeout(this._pollingTimer);
  }

  private async _isCorrelationStillActive(): Promise<boolean | RequestError> {

    const getActiveTokens: Function = async(): Promise<Array<ActiveToken> | RequestError> => {
      for (let retries: number = 0; retries < this._maxRetries; retries++) {
        try {
          return await this._managementApiClient
                           .getActiveTokensForProcessInstance(this.activeSolutionEntry.identity, this.processInstanceId);
        } catch (error) {
          const errorIsConnectionLost: boolean = error.message === 'Failed to fetch';

          if (errorIsConnectionLost) {
            return RequestError.ConnectionLost;
          }
        }
      }
    };

    const activeTokensOrRequestError: Array<ActiveToken> | RequestError = await getActiveTokens();

    const couldNotGetActiveTokens: boolean = activeTokensOrRequestError === RequestError.ConnectionLost
      || activeTokensOrRequestError === RequestError.OtherError;
    if (couldNotGetActiveTokens) {
      const requestError: RequestError = (activeTokensOrRequestError as RequestError);

      return requestError;
    }

    const allActiveTokens: Array<ActiveToken> =
      (activeTokensOrRequestError as Array<ActiveToken>);

    const correlationIsNotActive: boolean = allActiveTokens.length === 0;

    if (correlationIsNotActive) {
      this._correlationEnded();
    }

    return !correlationIsNotActive;
  }

  private _correlationEnded(): void {
    this._notificationService.showNotification(NotificationType.INFO, 'Process stopped.');
  }

  private async _getParentProcessInstanceId(): Promise<string> {
    // This is necessary because the managementApi sometimes throws an error when the correlation is not yet existing.
    const getCorrelation: () => Promise<DataModels.Correlations.Correlation> = async(): Promise<DataModels.Correlations.Correlation> => {

      for (let retries: number = 0; retries < this._maxRetries; retries++) {
        try {
          return await this._managementApiClient.getCorrelationById(this.activeSolutionEntry.identity, this.correlationId);
        } catch {
          continue;
        }
      }

      this._notificationService.showNotification(NotificationType.ERROR, 'Could not get correlation. Please try to start the process again.');

      return undefined;
    };

    const correlation: DataModels.Correlations.Correlation = await getCorrelation();

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

  private async _getProcessModelByProcessInstanceId(processInstanceId: string): Promise<DataModels.Correlations.CorrelationProcessInstance> {

    // This is necessary because the managementApi sometimes throws an error when the correlation is not yet existing.
    const getCorrelation: () => Promise<DataModels.Correlations.Correlation> = async(): Promise<DataModels.Correlations.Correlation> => {

      for (let retries: number = 0; retries < this._maxRetries; retries++) {
        try {
          return await this._managementApiClient.getCorrelationById(this.activeSolutionEntry.identity, this.correlationId);
        } catch {
          continue;
        }
      }

      this._notificationService.showNotification(NotificationType.ERROR, 'Could not get correlation. Please try to start the process again.');

      return undefined;
    };

    const correlation: DataModels.Correlations.Correlation = await getCorrelation();

    const errorGettingCorrelation: boolean = correlation === undefined;
    if (errorGettingCorrelation) {
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

  private _createProcessEndedCallback(): void {
    this._managementApiClient.onProcessEnded(this.activeSolutionEntry.identity, (message: EndEventReachedMessage): void => {
      if (message.correlationId !== this.correlationId) {
        this._createProcessEndedCallback();

        return;
      }

      this._processStopped = true;
      this._notificationService.showNotification(NotificationType.INFO, 'Process stopped.');
    }, true);
  }

  private _createProcessTerminatedCallback(): void {
    this._managementApiClient.onProcessTerminated(this.activeSolutionEntry.identity, (message: TerminateEndEventReachedMessage): void => {
      if (message.correlationId !== this.correlationId) {
        this._createProcessTerminatedCallback();

        return;
      }

      this._processStopped = true;
      this._notificationService.showNotification(NotificationType.INFO, 'Process terminated.');
    }, true);
  }
}
