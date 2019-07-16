import {EventAggregator, Subscription} from 'aurelia-event-aggregator';
import {bindable, inject} from 'aurelia-framework';
import {Router} from 'aurelia-router';

import {isError, NotFoundError, UnauthorizedError} from '@essential-projects/errors_ts';
import {DataModels, IManagementApi} from '@process-engine/management_api_contracts';

import {
  AuthenticationStateEvent,
  ISolutionEntry,
  ISolutionService,
  NotificationType,
} from '../../../contracts/index';
import environment from '../../../environment';
import {NotificationService} from '../../../services/notification-service/notification.service';

interface ITaskListRouteParameters {
  processInstanceId?: string;
  diagramName?: string;
  correlationId?: string;
}

type TaskSource = DataModels.EmptyActivities.EmptyActivity | DataModels.ManualTasks.ManualTask | DataModels.UserTasks.UserTask;

enum TaskType {
  UserTask = 'UserTask',
  ManualTask = 'ManualTask',
  EmptyActivity = 'EmptyActivity',
}

type TaskListEntry = {
  id: string;
  flowNodeInstanceId?: string;
  name: string;
  correlationId: string;
  processModelId: string;
  processInstanceId: string;
  taskType: TaskType;
};

@inject(EventAggregator, 'ManagementApiClientService', Router, 'NotificationService', 'SolutionService')
export class TaskList {

  @bindable() public activeSolutionEntry: ISolutionEntry;

  public currentPage: number = 0;
  public pageSize: number = 10;
  public totalItems: number;
  public paginationSize: number = 10;

  public requestSuccessful: boolean = false;

  private _activeSolutionUri: string;
  private _eventAggregator: EventAggregator;
  private _managementApiService: IManagementApi;
  private _router: Router;
  private _notificationService: NotificationService;
  private _solutionService: ISolutionService;

  private _subscriptions: Array<Subscription>;
  private _tasks: Array<TaskListEntry>;
  private _pollingTimeout: NodeJS.Timer | number;
  private _getTasks: () => Promise<Array<TaskListEntry>>;
  private _isAttached: boolean = false;

  constructor(eventAggregator: EventAggregator,
              managementApiService: IManagementApi,
              router: Router,
              notificationService: NotificationService,
              solutionService: ISolutionService,
  ) {
    this._eventAggregator = eventAggregator;
    this._managementApiService = managementApiService;
    this._router = router;
    this._notificationService = notificationService;
    this._solutionService = solutionService;
  }

  public initializeTaskList(routeParameters: ITaskListRouteParameters): void {
    const diagramName: string = routeParameters.diagramName;
    const correlationId: string = routeParameters.correlationId;
    const processInstanceId: string = routeParameters.processInstanceId;

    const hasDiagramName: boolean = diagramName !== undefined;
    const hasCorrelationId: boolean = correlationId !== undefined;
    const hasProcessInstanceId: boolean = processInstanceId !== undefined;

    if (hasDiagramName) {
      this._getTasks = (): Promise<Array<TaskListEntry>> => {
        return this._getTasksForProcessModel(diagramName);
      };
    } else if (hasCorrelationId) {
      this._getTasks = (): Promise<Array<TaskListEntry>> => {
        return this._getTasksForCorrelation(correlationId);
      };
    } else if (hasProcessInstanceId) {
      this._getTasks = (): Promise<Array<TaskListEntry>> => {
        return this._getTasksForProcessInstanceId(processInstanceId);
      };
    } else {
      this._getTasks = this._getAllTasks;
    }
  }

  public async attached(): Promise<void> {
    this._isAttached = true;

    const getTasksIsUndefined: boolean = this._getTasks === undefined;

    this._activeSolutionUri = this._router.currentInstruction.queryParams.solutionUri;

    const activeSolutionUriIsNotSet: boolean = this._activeSolutionUri === undefined;

    if (activeSolutionUriIsNotSet) {
      this._activeSolutionUri = window.localStorage.getItem('InternalProcessEngineRoute');
    }

    this.activeSolutionEntry = this._solutionService.getSolutionEntryForUri(this._activeSolutionUri);

    if (getTasksIsUndefined) {
      this._getTasks = this._getAllTasks;
    }

    this._subscriptions = [
      this._eventAggregator.subscribe(AuthenticationStateEvent.LOGIN, async() => {
        await this._updateTasks();
      }),
      this._eventAggregator.subscribe(AuthenticationStateEvent.LOGOUT, async() => {
        await this._updateTasks();
      }),
    ];

    await this._updateTasks();
    this._startPolling();
  }

  private _startPolling(): void {
    this._pollingTimeout = setTimeout(async() => {
      await this._updateTasks();

      if (this ._isAttached) {
        this._startPolling();
      }
    }, environment.processengine.dashboardPollingIntervalInMs);
  }

  public detached(): void {
    this._isAttached = false;
    clearTimeout(this._pollingTimeout as NodeJS.Timer);

    for (const subscription of this._subscriptions) {
      subscription.dispose();
    }
  }

  public goBack(): void {
    this._router.navigateBack();
  }

  public continueTask(task: TaskListEntry): void {
    const {correlationId, id, processInstanceId} = task;

    this._router.navigateToRoute('live-execution-tracker', {
      diagramName: task.processModelId,
      solutionUri: this.activeSolutionEntry.uri,
      correlationId: correlationId,
      processInstanceId: processInstanceId,
      taskId: id,
    });
  }

  public get shownTasks(): Array<TaskListEntry> {
    return this.tasks.slice((this.currentPage - 1) * this.pageSize, this.pageSize * this.currentPage);
  }

  public get tasks(): Array<TaskListEntry> {
    const noTasksExisitng: boolean = this._tasks === undefined;
    if (noTasksExisitng) {
      return [];
    }

    return this._tasks;
  }

  private async _getAllTasks(): Promise<Array<TaskListEntry>> {

    const allProcessModels: DataModels.ProcessModels.ProcessModelList = await this._managementApiService
      .getProcessModels(this.activeSolutionEntry.identity);

    // TODO (ph): This will create 1 + n http reqeusts, where n is the number of process models in the processengine.
    const promisesForAllUserTasks: Array<Promise<Array<TaskListEntry>>> = allProcessModels.processModels
      .map(async(processModel: DataModels.ProcessModels.ProcessModel): Promise<Array<TaskListEntry>> => {
        const userTaskList: DataModels.UserTasks.UserTaskList = await this._managementApiService
          .getUserTasksForProcessModel(this.activeSolutionEntry.identity, processModel.id);

        return this._mapToTaskListEntry(userTaskList.userTasks, TaskType.UserTask);
      });

    const promisesForAllManualTasks: Array<Promise<Array<TaskListEntry>>> = allProcessModels.processModels
      .map(async(processModel: DataModels.ProcessModels.ProcessModel): Promise<Array<TaskListEntry>> => {
        const manualTaskList: DataModels.ManualTasks.ManualTaskList =
          await this._managementApiService.getManualTasksForProcessModel(this.activeSolutionEntry.identity, processModel.id);

        return this._mapToTaskListEntry(manualTaskList.manualTasks, TaskType.ManualTask);
      });

    const promisesForAllEmptyActivities: Array<Promise<Array<TaskListEntry>>> = allProcessModels.processModels
      .map(async(processModel: DataModels.ProcessModels.ProcessModel): Promise<Array<TaskListEntry>> => {
        const emptyActivityList: DataModels.EmptyActivities.EmptyActivityList =
          await this._managementApiService.getEmptyActivitiesForProcessModel(this.activeSolutionEntry.identity, processModel.id);

        return this._mapToTaskListEntry(emptyActivityList.emptyActivities, TaskType.EmptyActivity);
      });
    // Concatenate the Promises for requesting UserTasks and requesting ManualTasks.
    const promisesForAllTasksForAllProcessModels: Array<TaskListEntry> = []
      .concat(promisesForAllUserTasks, promisesForAllManualTasks, promisesForAllEmptyActivities);

    // Await all promises.
    const allTasksForAllProcessModels: Array<TaskListEntry> =
      await Promise.all(promisesForAllTasksForAllProcessModels);

    // Flatten all results.
    const allTasks: Array<TaskListEntry> = [].concat(...allTasksForAllProcessModels);

    return allTasks;
  }

  private async _getTasksForProcessModel(processModelId: string): Promise<Array<TaskListEntry>> {

    const userTaskList: DataModels.UserTasks.UserTaskList =
      await this._managementApiService.getUserTasksForProcessModel(this.activeSolutionEntry.identity, processModelId);

    const manualTaskList: DataModels.ManualTasks.ManualTaskList =
      await this._managementApiService.getManualTasksForProcessModel(this.activeSolutionEntry.identity, processModelId);

    const emptyActivityList: DataModels.EmptyActivities.EmptyActivityList =
      await this._managementApiService.getEmptyActivitiesForProcessModel(this.activeSolutionEntry.identity, processModelId);

    const userTasks: Array<TaskListEntry> = this._mapToTaskListEntry(userTaskList.userTasks, TaskType.UserTask);
    const manualTasks: Array<TaskListEntry> = this._mapToTaskListEntry(manualTaskList.manualTasks, TaskType.ManualTask);
    const emptyActivities: Array<TaskListEntry> = this._mapToTaskListEntry(emptyActivityList.emptyActivities, TaskType.EmptyActivity);

    return [].concat(userTasks, manualTasks, emptyActivities);
  }

  private async _getTasksForCorrelation(correlationId: string): Promise<Array<TaskListEntry>> {

    const runningCorrelations: Array<DataModels.Correlations.Correlation> =
      await this._managementApiService.getActiveCorrelations(this.activeSolutionEntry.identity);

    const correlation: DataModels.Correlations.Correlation = runningCorrelations.find((otherCorrelation: DataModels.Correlations.Correlation) => {
      return otherCorrelation.id === correlationId;
    });

    const correlationWasNotFound: boolean = correlation === undefined;
    if (correlationWasNotFound) {
      throw new NotFoundError(`No correlation found with id ${correlationId}.`);
    }

    const userTaskList: DataModels.UserTasks.UserTaskList =
      await this._managementApiService.getUserTasksForCorrelation(this.activeSolutionEntry.identity, correlationId);

    const manualTaskList: DataModels.ManualTasks.ManualTaskList =
      await this._managementApiService.getManualTasksForCorrelation(this.activeSolutionEntry.identity, correlationId);

    const emptyActivityList: DataModels.EmptyActivities.EmptyActivityList =
      await this._managementApiService.getEmptyActivitiesForCorrelation(this.activeSolutionEntry.identity, correlationId);

    const userTasks: Array<TaskListEntry> =
      this._mapToTaskListEntry(userTaskList.userTasks, TaskType.UserTask);

    const manualTasks: Array<TaskListEntry> =
      this._mapToTaskListEntry(manualTaskList.manualTasks, TaskType.ManualTask);

    const emptyActivities: Array<TaskListEntry> =
      this._mapToTaskListEntry(emptyActivityList.emptyActivities, TaskType.EmptyActivity);

    return [].concat(userTasks, manualTasks, emptyActivities);
  }

  private async _getTasksForProcessInstanceId(processInstanceId: string): Promise<Array<TaskListEntry>> {

    const userTaskList: DataModels.UserTasks.UserTaskList =
      await this._managementApiService.getUserTasksForProcessInstance(this.activeSolutionEntry.identity, processInstanceId);

    const manualTaskList: DataModels.ManualTasks.ManualTaskList =
      await this._managementApiService.getManualTasksForProcessInstance(this.activeSolutionEntry.identity, processInstanceId);

    const emptyActivityList: DataModels.EmptyActivities.EmptyActivityList =
      await this._managementApiService.getEmptyActivitiesForProcessInstance(this.activeSolutionEntry.identity, processInstanceId);

    const userTasksAndProcessModels: Array<TaskListEntry> = this._mapToTaskListEntry(userTaskList.userTasks, TaskType.UserTask);
    const manualTasks: Array<TaskListEntry> = this._mapToTaskListEntry(manualTaskList.manualTasks, TaskType.ManualTask);
    const emptyActivities: Array<TaskListEntry> =
      this._mapToTaskListEntry(emptyActivityList.emptyActivities, TaskType.EmptyActivity);

    return [].concat(userTasksAndProcessModels, manualTasks, emptyActivities);
  }

  private _mapToTaskListEntry(
    tasks: Array<TaskSource>,
    targetType: TaskType,
  ): Array<TaskListEntry> {

    const mappedTasks: Array<TaskListEntry> = tasks
      .map((task: TaskSource): TaskListEntry => {
        return {
          correlationId: task.correlationId,
          id: task.id,
          flowNodeInstanceId: task.flowNodeInstanceId,
          processInstanceId: task.processInstanceId,
          processModelId: task.processModelId,
          name: task.name,
          // NOTE: Can't use instanceof or typeof, because the tasks were received as a plain JSON that does not have any type infos.
          // TODO: Add type mapping to the Management API Client.
          taskType: targetType,
        };
      });

    return mappedTasks;
  }

  private async _updateTasks(): Promise<void> {
    try {
      this._tasks = await this._getTasks();
      this.requestSuccessful = true;
    } catch (error) {

      this.requestSuccessful = false;

      if (isError(error, UnauthorizedError)) {
        this._notificationService.showNotification(NotificationType.ERROR, 'You don\'t have permission to view the task list.');
        this._router.navigateToRoute('start-page');
      } else {
        this._notificationService.showNotification(NotificationType.ERROR, `Error receiving task list: ${error.message}`);
        this._tasks = undefined;
      }
    }

    this.totalItems = this.tasks.length;
  }
}
