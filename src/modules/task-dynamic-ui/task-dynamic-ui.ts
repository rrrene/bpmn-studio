import {EventAggregator, Subscription} from 'aurelia-event-aggregator';
import {bindable, computedFrom, inject} from 'aurelia-framework';
import {Router} from 'aurelia-router';
import {domEventDispatch} from 'dom-event-dispatch';

import {IIdentity} from '@essential-projects/iam_contracts';
import {DataModels} from '@process-engine/management_api_contracts';

import {
  AuthenticationStateEvent,
  IDynamicUiService,
  ISolutionEntry,
  ISolutionService,
  NotificationType,
} from '../../contracts/index';
import {NotificationService} from '../../services/notification-service/notification.service';
import {DynamicUiWrapper} from '../dynamic-ui-wrapper/dynamic-ui-wrapper';

interface RouteParameters {
  diagramName: string;
  solutionUri: string;
  correlationId: string;
  processInstanceId: string;
  taskId: string;
}

@inject(EventAggregator, 'DynamicUiService', Router, 'NotificationService', 'SolutionService', Element)
export class TaskDynamicUi {
  public dynamicUiWrapper: DynamicUiWrapper;

  @bindable() public correlationId: string;
  @bindable() public processModelId: string;
  @bindable() public processInstanceId: string;
  @bindable() public taskId: string;
  @bindable() public isModal: boolean;
  @bindable() public activeSolutionEntry: ISolutionEntry;

  private _activeDiagramName: string;
  private _activeSolutionUri: string;
  private _eventAggregator: EventAggregator;
  private _router: Router;
  private _notificationService: NotificationService;
  private _solutionService: ISolutionService;
  private _dynamicUiService: IDynamicUiService;
  private _subscriptions: Array<Subscription>;
  private _userTask: DataModels.UserTasks.UserTask;
  private _manualTask: DataModels.ManualTasks.ManualTask;
  private _element: Element;
  private _identity: IIdentity;

  constructor(
    eventAggregator: EventAggregator,
    dynamicUiService: IDynamicUiService,
    router: Router,
    notificationService: NotificationService,
    solutionService: ISolutionService,
    element: Element,
  ) {
    this._eventAggregator = eventAggregator;
    this._dynamicUiService = dynamicUiService;
    this._router = router;
    this._notificationService = notificationService;
    this._solutionService = solutionService;
    this._element = element;
  }

  public activate(routeParameters: RouteParameters): void {
    // This is called when starting tasks
    this.correlationId = routeParameters.correlationId;
    this.processModelId = routeParameters.diagramName;
    this.processInstanceId = routeParameters.processInstanceId;
    this.taskId = routeParameters.taskId;
    this._activeDiagramName = routeParameters.diagramName;
    this._activeSolutionUri = routeParameters.solutionUri;

    this.activeSolutionEntry = this._solutionService.getSolutionEntryForUri(this._activeSolutionUri);
    this._identity = this.activeSolutionEntry.identity;

    this.isModal = false;
  }

  public attached(): void {
    this.dynamicUiWrapper.identity = this._identity;
    this.getTask();

    this._subscriptions = [
      this._eventAggregator.subscribe(AuthenticationStateEvent.LOGIN, () => {
        this.getTask();
      }),
      this._eventAggregator.subscribe(AuthenticationStateEvent.LOGOUT, () => {
        this.getTask();
      }),
    ];

    this.dynamicUiWrapper.onButtonClick = (action: string): void => {
      this._finishTask(action);
    };

    this.setDynamicUIWrapperUserTask();
    this.setDynamicUIWrapperManualTask();
    this.dynamicUiWrapper.activeSolutionEntry = this.activeSolutionEntry;
  }

  public activeSolutionEntryChanged(newValue: ISolutionEntry): void {
    this._identity = newValue.identity;

    const dynamicUiWrapperIsUndefined: boolean = this.dynamicUiWrapper === undefined;
    if (dynamicUiWrapperIsUndefined) {
      return;
    }

    this.dynamicUiWrapper.activeSolutionEntry = newValue;
  }

  public detached(): void {
    for (const subscription of this._subscriptions) {
      subscription.dispose();
    }
  }

  public set userTask(userTask: DataModels.UserTasks.UserTask) {
    this._userTask = userTask;

    this.setDynamicUIWrapperUserTask();
  }

  @computedFrom('_userTask')
  public get userTask(): DataModels.UserTasks.UserTask {
    return this._userTask;
  }

  public set manualTask(manualTask: DataModels.ManualTasks.ManualTask) {
    this._manualTask = manualTask;

    this.setDynamicUIWrapperManualTask();
  }

  @computedFrom('_manualTask')
  public get manualTask(): DataModels.ManualTasks.ManualTask {
    return this._manualTask;
  }

  @computedFrom('_userTask', '_manualTask')
  public get taskName(): string {
    const nonWhiteSpaceRegex: RegExp = /\S/;
    const task: DataModels.UserTasks.UserTask | DataModels.ManualTasks.ManualTask =
      this._userTask === undefined ? this._manualTask : this._userTask;

    const noTaskIsSet: boolean = task === undefined;
    if (noTaskIsSet) {
      return;
    }

    const taskNameIsSet: boolean = nonWhiteSpaceRegex.test(task.name);
    const taskDisplayName: string = taskNameIsSet ? task.name : task.id;

    return taskDisplayName;
  }

  public clearTasks(): void {
    this.userTask = undefined;
    this.manualTask = undefined;
  }

  private _finishTask(action: string): void {
    if (this.isModal) {
      domEventDispatch.dispatchEvent(this._element, 'close-modal', {bubbles: true});
      this.clearTasks();

      return;
    }

    const task: DataModels.UserTasks.UserTask | DataModels.ManualTasks.ManualTask =
      this._userTask === undefined ? this._manualTask : this._userTask;

    this._router.navigateToRoute('live-execution-tracker', {
      diagramName: this._activeDiagramName,
      solutionUri: this._activeSolutionUri,
      correlationId: task.correlationId,
      processInstanceId: this.processInstanceId,
    });
  }

  private async getTask(): Promise<void> {
    try {
      const processInstanceIdNotGiven: boolean = this.processInstanceId === undefined;

      if (processInstanceIdNotGiven) {
        throw Error(`Invalid ProcessInstance ID: ${this.processInstanceId}`);
      }

      this.userTask = await this._dynamicUiService.getUserTask(this._identity, this.processInstanceId, this.taskId);

      const userTaskFound: boolean = this._userTask !== undefined;
      if (userTaskFound) {
        return;
      }

      this.manualTask = await this._dynamicUiService.getManualTask(this._identity, this.processInstanceId, this.taskId);

      const manualTaskFound: boolean = this._manualTask !== undefined;
      if (manualTaskFound) {
        return;
      }

      throw new Error(`No UserTask or ManualTask with ID ${this.taskId} found!`);
    } catch (error) {
      this._notificationService.showNotification(NotificationType.ERROR, `Failed to refresh task: ${error.message}`);
      throw error;
    }
  }

  private async setDynamicUIWrapperUserTask(): Promise<void> {
    const dynamicUiWrapperNotExisting: boolean = this.dynamicUiWrapper === undefined;

    if (dynamicUiWrapperNotExisting) {
      return;
    }

    this.dynamicUiWrapper.currentUserTask = this._userTask;
  }

  private async setDynamicUIWrapperManualTask(): Promise<void> {
    const dynamicUiWrapperNotExisting: boolean = this.dynamicUiWrapper === undefined;

    if (dynamicUiWrapperNotExisting) {
      return;
    }

    this.dynamicUiWrapper.currentManualTask = this._manualTask;
  }
}
