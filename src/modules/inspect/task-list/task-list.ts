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

interface IUserTaskWithProcessModel {
  userTask: DataModels.UserTasks.UserTask;
  processModel: DataModels.ProcessModels.ProcessModel;
}

interface IManualTaskWithProcessModel {
  manualTask: DataModels.ManualTasks.ManualTask;
  processModel: DataModels.ProcessModels.ProcessModel;
}

type UserAndManualTasksWithProcessModels = Array<IUserTaskWithProcessModel & IManualTaskWithProcessModel>;
type PromisesForUserAndManualTasks = Promise<UserAndManualTasksWithProcessModels>;

@inject(EventAggregator, 'ManagementApiClientService', Router, 'NotificationService', 'SolutionService')
export class TaskList {

  @bindable() public activeSolutionEntry: ISolutionEntry;

  public currentPage: number = 0;
  public pageSize: number = 10;
  public totalItems: number;

  public requestSuccessful: boolean = false;

  private _activeSolutionUri: string;
  private _eventAggregator: EventAggregator;
  private _managementApiService: IManagementApi;
  private _router: Router;
  private _notificationService: NotificationService;
  private _solutionService: ISolutionService;

  private _subscriptions: Array<Subscription>;
  private _userTasks: Array<IUserTaskWithProcessModel>;
  private _getTasksIntervalId: number;
  private _getTasks: () => Promise<Array<IUserTaskWithProcessModel>>;

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
      this._getTasks = (): Promise<Array<IUserTaskWithProcessModel>> => {
        return this._getTasksForProcessModel(diagramName);
      };
    } else if (hasCorrelationId) {
      this._getTasks = (): Promise<Array<IUserTaskWithProcessModel>> => {
        return this._getTasksForCorrelation(correlationId);
      };
    } else if (hasProcessInstanceId) {
      this._getTasks = (): Promise<Array<IUserTaskWithProcessModel>> => {
        return this._getTasksForProcessInstanceId(processInstanceId);
      };
    } else {
      this._getTasks = this._getAllTasks;
    }
  }

  public attached(): void {
    const getTasksIsUndefined: boolean = this._getTasks === undefined;

    this._activeSolutionUri = this._router.currentInstruction.queryParams.solutionUri;

    const activeSolutionUriIsNotSet: boolean = this._activeSolutionUri === undefined;

    if (activeSolutionUriIsNotSet) {
      this._activeSolutionUri = window.localStorage.getItem('InternalProcessEngineRoute');
    }

    this.activeSolutionEntry = this._solutionService.getSolutionEntryForUri(this._activeSolutionUri);

    if (getTasksIsUndefined) {
      this._getTasks = this._getAllTasks;
      this.updateTasks();
    }

    this._getTasksIntervalId = window.setInterval(() => {
      this.updateTasks();
    }, environment.processengine.dashboardPollingIntervalInMs);

    this._subscriptions = [
      this._eventAggregator.subscribe(AuthenticationStateEvent.LOGIN, () => {
        this.updateTasks();
      }),
      this._eventAggregator.subscribe(AuthenticationStateEvent.LOGOUT, () => {
        this.updateTasks();
      }),
    ];

    this.updateTasks();
  }

  public detached(): void {
    clearInterval(this._getTasksIntervalId);

    for (const subscription of this._subscriptions) {
      subscription.dispose();
    }
  }

  public goBack(): void {
    this._router.navigateBack();
  }

  public continueTask(taskWithProcessModel: IUserTaskWithProcessModel & IManualTaskWithProcessModel): void {
    const taskIsAnUserTask: boolean = taskWithProcessModel.userTask !== undefined;
    const taskToProcess: DataModels.UserTasks.UserTask | DataModels.ManualTasks.ManualTask = taskIsAnUserTask
                                                                                           ? taskWithProcessModel.userTask
                                                                                           : taskWithProcessModel.manualTask;

    const {correlationId, id, processInstanceId} = taskToProcess;

    const tasksProcessModelId: string = taskToProcess.processModelId;

    const taskIsFromCallActivity: boolean = taskWithProcessModel.processModel.id !== tasksProcessModelId;

    const processModelId: string = taskIsFromCallActivity
                                 ? tasksProcessModelId
                                 : taskWithProcessModel.processModel.id;

    this._router.navigateToRoute('live-execution-tracker', {
      diagramName: processModelId,
      solutionUri: this.activeSolutionEntry.uri,
      correlationId: correlationId,
      processInstanceId: processInstanceId,
      taskId: id,
    });
  }

  public get shownTasks(): Array<IUserTaskWithProcessModel> {
    return this.tasks.slice((this.currentPage - 1) * this.pageSize, this.pageSize * this.currentPage);
  }

  public get tasks(): Array<IUserTaskWithProcessModel> {
    const noTasksExisitng: boolean = this._userTasks === undefined;
    if (noTasksExisitng) {
      return [];
    }

    return this._userTasks;
  }

  private async _getAllTasks(): Promise<Array<IUserTaskWithProcessModel & IManualTaskWithProcessModel>> {

    const allProcessModels: DataModels.ProcessModels.ProcessModelList = await this._managementApiService
      .getProcessModels(this.activeSolutionEntry.identity);

    // TODO (ph): This will create 1 + n http reqeusts, where n is the number of process models in the processengine.
    const promisesForAllUserTasks: Array<Promise<Array<IUserTaskWithProcessModel>>> = allProcessModels.processModels
      .map(async(processModel: DataModels.ProcessModels.ProcessModel): Promise<Array<IUserTaskWithProcessModel>> => {
        const userTaskList: DataModels.UserTasks.UserTaskList = await this._managementApiService
          .getUserTasksForProcessModel(this.activeSolutionEntry.identity, processModel.id);

        const userTasksAndProcessModels: Array<IUserTaskWithProcessModel> = this._addProcessModelToUserTasks(userTaskList, processModel);

        return userTasksAndProcessModels;
      });

    const promisesForAllManualTasks: Array<Promise<Array<IManualTaskWithProcessModel>>> = allProcessModels.processModels
      .map(async(processModel: DataModels.ProcessModels.ProcessModel): Promise<Array<IManualTaskWithProcessModel>> => {
        const manualTaskList: DataModels.ManualTasks.ManualTaskList =
          await this._managementApiService.getManualTasksForProcessModel(this.activeSolutionEntry.identity, processModel.id);

        const manualTasksAndProcessModels: Array<IManualTaskWithProcessModel> = this._addProcessModelToManualTasks(manualTaskList, processModel);

        return manualTasksAndProcessModels;
      });

    // Concatenate the Promises for requesting UserTasks and requesting ManualTasks.
    const promisesForAllTasksForAllProcessModels: Array<PromisesForUserAndManualTasks> = []
      .concat(promisesForAllUserTasks, promisesForAllManualTasks);

    // Await all promises.
    const allTasksForAllProcessModels: Array<UserAndManualTasksWithProcessModels> =
      await Promise.all(promisesForAllTasksForAllProcessModels);

    // Flatten all results.
    const allTasks: UserAndManualTasksWithProcessModels = [].concat(...allTasksForAllProcessModels);

    return allTasks;
  }

  private async _getTasksForProcessModel(processModelId: string): Promise<Array<IUserTaskWithProcessModel & IManualTaskWithProcessModel>> {

    const processModel: DataModels.ProcessModels.ProcessModel = await
      this
        ._managementApiService
        .getProcessModelById(this.activeSolutionEntry.identity, processModelId);

    const userTaskList: DataModels.UserTasks.UserTaskList =
      await this._managementApiService.getUserTasksForProcessModel(this.activeSolutionEntry.identity, processModelId);

    const manualTaskList: DataModels.ManualTasks.ManualTaskList =
      await this._managementApiService.getManualTasksForProcessModel(this.activeSolutionEntry.identity, processModelId);

    const userTasksAndProcessModels: Array<IUserTaskWithProcessModel> = this._addProcessModelToUserTasks(userTaskList, processModel);
    const manualTasksAndProcessModels: Array<IManualTaskWithProcessModel> = this._addProcessModelToManualTasks(manualTaskList, processModel);

    return [].concat(userTasksAndProcessModels, manualTasksAndProcessModels);
  }

  private async _getTasksForCorrelation(correlationId: string): Promise<Array<IUserTaskWithProcessModel & IManualTaskWithProcessModel>> {

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

    // TODO: This needs to be refactored so that the correct ProcessModel will be used depending on the user task
    const processModelOfCorrelation: DataModels.ProcessModels.ProcessModel = await
      this
        ._managementApiService
        .getProcessModelById(this.activeSolutionEntry.identity, correlation.processModels[0].processModelId);

    const userTasksAndProcessModels: Array<IUserTaskWithProcessModel> = this._addProcessModelToUserTasks(userTaskList, processModelOfCorrelation);
    const manualTasksAndProcessModels: Array<IManualTaskWithProcessModel> = this._addProcessModelToManualTasks(
      manualTaskList, processModelOfCorrelation);

    return [].concat(userTasksAndProcessModels, manualTasksAndProcessModels);
  }

  private async _getTasksForProcessInstanceId(processInstanceId: string): Promise<Array<IUserTaskWithProcessModel & IManualTaskWithProcessModel>> {
    const userTaskList: DataModels.UserTasks.UserTaskList =
      await this._managementApiService.getUserTasksForProcessInstance(this.activeSolutionEntry.identity, processInstanceId);
    const manualTaskList: DataModels.ManualTasks.ManualTaskList =
      await this._managementApiService.getManualTasksForProcessInstance(this.activeSolutionEntry.identity, processInstanceId);

    const processModel: DataModels.ProcessModels.ProcessModel = await
      this
        ._managementApiService
        .getProcessModelByProcessInstanceId(this.activeSolutionEntry.identity, processInstanceId);

    const userTasksAndProcessModels: Array<IUserTaskWithProcessModel> = this._addProcessModelToUserTasks(userTaskList, processModel);
    const manualTasksAndProcessModels: Array<IManualTaskWithProcessModel> = this._addProcessModelToManualTasks(manualTaskList, processModel);

    return [].concat(userTasksAndProcessModels, manualTasksAndProcessModels);
  }

  private _addProcessModelToUserTasks(
    userTaskList: DataModels.UserTasks.UserTaskList,
    processModel: DataModels.ProcessModels.ProcessModel,
  ): Array<IUserTaskWithProcessModel> {

    const userTasksAndProcessModels: Array<IUserTaskWithProcessModel> = userTaskList.userTasks
      .map((userTask: DataModels.UserTasks.UserTask): IUserTaskWithProcessModel => ({
        processModel: processModel,
        userTask: userTask,
      }));

    return userTasksAndProcessModels;
  }

  private _addProcessModelToManualTasks(
    manualTaskList: DataModels.ManualTasks.ManualTaskList,
    processModel: DataModels.ProcessModels.ProcessModel,
  ): Array<IManualTaskWithProcessModel> {

    const manualTasksAndProcessModels: Array<IManualTaskWithProcessModel> = manualTaskList.manualTasks
      .map((manualTask: DataModels.ManualTasks.ManualTask): IManualTaskWithProcessModel => ({
        processModel: processModel,
        manualTask: manualTask,
      }));

    return manualTasksAndProcessModels;
  }

  public async updateTasks(): Promise<void> {
    try {
      this._userTasks = await this._getTasks();
      this.requestSuccessful = true;
    } catch (error) {

      this.requestSuccessful = false;

      if (isError(error, UnauthorizedError)) {

        this._notificationService.showNotification(NotificationType.ERROR, 'You don\'t have permission to view the task list.');
        this._router.navigateToRoute('start-page');

      } else {

        this._notificationService.showNotification(NotificationType.ERROR, `Error receiving task list: ${error.message}`);
        this._userTasks = undefined;

      }
    }

    this.totalItems = this.tasks.length;
  }
}
