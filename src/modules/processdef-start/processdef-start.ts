import {ManagementApiClientService} from '@process-engine/management_api_client';
import {ManagementContext, ProcessModelExecution, UserTask, UserTaskList} from '@process-engine/management_api_contracts';
import {EventAggregator, Subscription} from 'aurelia-event-aggregator';
import {bindable, computedFrom, inject} from 'aurelia-framework';
import {Router} from 'aurelia-router';
import {AuthenticationStateEvent, NotificationType} from '../../contracts/index';
import {NewAuthenticationService} from '../authentication/new_authentication.service';
import {DynamicUiWrapper} from '../dynamic-ui-wrapper/dynamic-ui-wrapper';
import {NotificationService} from '../notification/notification.service';

interface RouteParameters {
  processModelId: string;
  correlationId: string;
}

@inject(EventAggregator,
        Router,
        'NotificationService',
        'ManagementApiClientService',
        'NewAuthenticationService')
export class ProcessDefStart {

  public dynamicUiWrapper: DynamicUiWrapper;
  public processModel: ProcessModelExecution.ProcessModel;

  private _notificationService: NotificationService;
  private _eventAggregator: EventAggregator;
  private _subscriptions: Array<Subscription>;
  private _processModelId: string;
  private _router: Router;
  private _managementApiClient: ManagementApiClientService;
  private _authenticationService: NewAuthenticationService;
  private _correlationId: string;

  constructor(eventAggregator: EventAggregator,
              router: Router,
              notificationService: NotificationService,
              managementApiClient: ManagementApiClientService,
              authenticationService: NewAuthenticationService) {

    this._eventAggregator = eventAggregator;
    this._router = router;
    this._notificationService = notificationService;
    this._managementApiClient = managementApiClient;
    this._authenticationService = authenticationService;
  }

  // TODO: Add a usefull comment here; what does it do? what is it good for? when is this invoked?
  public async activate(routeParameters: RouteParameters): Promise<void> {
    this._processModelId = routeParameters.processModelId;
    this._correlationId = routeParameters.correlationId;

    await this._refreshProcess();

    this._subscriptions = [
      /*
       * If the user this login/logout we need to refresh the process;
       * mainly due to a possible the change in access rights.
       */
      this._eventAggregator.subscribe(AuthenticationStateEvent.LOGIN, () => {
        this._refreshProcess();
      }),
      this._eventAggregator.subscribe(AuthenticationStateEvent.LOGOUT, () => {
        this._refreshProcess();
      }),
      /*
       * The closed-process event is thrown at the end of a process run;
       * we then use the router to navigate to the prvious view-- this could be the
       * design view-- but any other last view will work as well.
       */
      this._eventAggregator.subscribe('closed-process', () => {
        this._router.navigateBack();
      }),
    ];
  }

  public async attached(): Promise<void> {
    this.dynamicUiWrapper.currentUserTask = await this._waitForUserTask(0);

    if (this.dynamicUiWrapper.currentUserTask === undefined) {
      this._notificationService.showNonDisappearingNotification(NotificationType.INFO, 'No User Task found! Redirecting to task-list.');

      this._router.navigateToRoute('task-list-correlation', {
        correlationId: this._correlationId,
      });

      return;
    }

    this.dynamicUiWrapper.onButtonClick = (action: string): void => {
      this._finishTask(action);
    };
  }

  public detached(): void {
    for (const subscription of this._subscriptions) {
      subscription.dispose();
    }
  }

  private async _waitForUserTask(retryCount: number): Promise<UserTask> {
    const maxNumberOfRetries: number = 10;
    const delayBetweenRetriesInMs: number = 500;

    if (retryCount >= maxNumberOfRetries) {
      return undefined;
    }

    await this._wait(delayBetweenRetriesInMs);

    const userTask: UserTask = await this._setUserTaskToHandle();
    retryCount++;

    return userTask || this._waitForUserTask(retryCount);
  }

  private async _refreshProcess(): Promise<void> {
    try {
      const managementContext: ManagementContext = this._getManagementContext();

      this.processModel = await this._managementApiClient.getProcessModelById(managementContext, this._processModelId);
    } catch (error) {
      this._notificationService.showNotification(NotificationType.ERROR, `Failed to refresh process: ${error.message}`);
      throw error;
    }
  }

  private _finishTask(action: string): void {
    this._router.navigateToRoute('waiting-room', {
      processModelId: this._processModelId,
    });
  }

  private async _setUserTaskToHandle(): Promise<UserTask> {
    const managementContext: ManagementContext = this._getManagementContext();
    const userTaskList: UserTaskList = await this._managementApiClient.getUserTasksForProcessModelInCorrelation(managementContext,
                                                                                                                this._processModelId,
                                                                                                                this._correlationId);
    const userTaskToHandle: UserTask = userTaskList.userTasks[0];

    return userTaskToHandle;
  }

  private async _wait(timeInMs: number): Promise<void> {
    await new Promise((resolve: Function, reject: Function): void => {
      setTimeout(() => {
        resolve();
      }, timeInMs);
    });
  }

  private _getManagementContext(): ManagementContext {
    const accessToken: string = this._authenticationService.getAccessToken();
    const context: ManagementContext = {
      identity: accessToken,
    };

    return context;
  }
}
