import {EventAggregator, Subscription} from 'aurelia-event-aggregator';
import {bindable, inject, observable} from 'aurelia-framework';
import {Router} from 'aurelia-router';

import {IIdentity} from '@essential-projects/iam_contracts';
import {DataModels, IManagementApi} from '@process-engine/management_api_contracts';

import {
  AuthenticationStateEvent,
  ISolutionEntry,
  ISolutionService,
  NotificationType,
} from '../../../contracts/index';
import environment from '../../../environment';
import {NotificationService} from '../../../services/notification-service/notification.service';

@inject('ManagementApiClientService', EventAggregator, 'NotificationService', 'SolutionService', Router)
export class ProcessList {

  @observable public currentPage: number = 1;
  @bindable() public activeSolutionEntry: ISolutionEntry;
  public pageSize: number = 10;
  public totalItems: number;
  public requestSuccessful: boolean = false;
  public correlations: Array<DataModels.Correlations.Correlation> = [];

  private _managementApiService: IManagementApi;
  private _eventAggregator: EventAggregator;
  private _notificationService: NotificationService;
  private _solutionService: ISolutionService;
  private _activeSolutionUri: string;
  private _router: Router;

  private _pollingTimeout: NodeJS.Timer | number;
  private _subscriptions: Array<Subscription>;
  private _correlations: Array<DataModels.Correlations.Correlation> = [];
  private _isAttached: boolean = false;

  constructor(managementApiService: IManagementApi,
              eventAggregator: EventAggregator,
              notificationService: NotificationService,
              solutionService: ISolutionService,
              router: Router) {
    this._managementApiService = managementApiService;
    this._eventAggregator = eventAggregator;
    this._notificationService = notificationService;
    this._solutionService = solutionService;
    this._router = router;
  }

  public get correlations(): Array<DataModels.Correlations.Correlation> {
    const firstCorrelationIndex: number = (this.currentPage - 1) * this.pageSize;
    const lastCorrelationIndex: number = (this.pageSize * this.currentPage);

    return this._correlations.slice(firstCorrelationIndex, lastCorrelationIndex);
  }

  public async currentPageChanged(newValue: number, oldValue: number): Promise<void> {
    const oldValueIsDefined: boolean = oldValue !== undefined && oldValue !== null;

    if (oldValueIsDefined) {
      await this.updateCorrelationList();
    }
  }

  public async attached(): Promise<void> {
    this._isAttached = true;
    this._activeSolutionUri = this._router.currentInstruction.queryParams.solutionUri;

    const activeSolutionUriIsNotSet: boolean = this._activeSolutionUri === undefined;

    if (activeSolutionUriIsNotSet) {
      this._activeSolutionUri = window.localStorage.getItem('InternalProcessEngineRoute');
    }

    const activeSolutionUriIsNotRemote: boolean = !this._activeSolutionUri.startsWith('http');
    if (activeSolutionUriIsNotRemote) {
      this._activeSolutionUri = window.localStorage.getItem('InternalProcessEngineRoute');
    }

    this.activeSolutionEntry = this._solutionService.getSolutionEntryForUri(this._activeSolutionUri);

    await this.updateCorrelationList();
    this._startPolling();

    this._subscriptions = [
      this._eventAggregator.subscribe(AuthenticationStateEvent.LOGIN, () => {
        this.updateCorrelationList();
      }),
      this._eventAggregator.subscribe(AuthenticationStateEvent.LOGOUT, () => {
        this.updateCorrelationList();
      }),
    ];
  }

  private _startPolling(): void {
    this._pollingTimeout = setTimeout(async() => {
      await this.updateCorrelationList();

      if (this._isAttached) {
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

  public async updateCorrelationList(): Promise<void> {
    try {
      const correlations: Array<DataModels.Correlations.Correlation> = await this.getAllActiveCorrelations();
      const correlationListWasUpdated: boolean = JSON.stringify(correlations.sort(this.sortCorrelations)) !== JSON.stringify(this._correlations);
      if (correlationListWasUpdated) {
        this._correlations = correlations;
        this._correlations.sort(this.sortCorrelations);
      }

      this.requestSuccessful = true;
    } catch (error) {
      this._notificationService.showNotification(NotificationType.ERROR, `Error receiving process list: ${error.message}`);
      this.requestSuccessful = false;
    }

    const correlationsAreNotSet: boolean = this._correlations === undefined || this._correlations === null;
    if (correlationsAreNotSet) {
      this._correlations = [];
    }

    this.totalItems = this._correlations.length;
  }

  public async stopProcessInstance(processInstanceId: string): Promise<void> {
    try {
      await this._managementApiService.terminateProcessInstance(this.activeSolutionEntry.identity, processInstanceId);

      this._correlations = await this.getAllActiveCorrelations();

    } catch (error) {
      this._notificationService
        .showNotification(NotificationType.ERROR, `Error while stopping Process! ${error}`);
    }
  }

  private async getAllActiveCorrelations(): Promise<Array<DataModels.Correlations.Correlation>> {
    const identity: IIdentity = this.activeSolutionEntry.identity;

    return this._managementApiService.getActiveCorrelations(identity);
  }

  private sortCorrelations(correlation1: DataModels.Correlations.Correlation, correlation2: DataModels.Correlations.Correlation): number {
    return Date.parse(correlation2.createdAt.toString()) - Date.parse(correlation1.createdAt.toString());
  }
}
