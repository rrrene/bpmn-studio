import {EventAggregator, Subscription} from 'aurelia-event-aggregator';
import {bindable, inject, observable} from 'aurelia-framework';
import {Router} from 'aurelia-router';

import {IIdentity} from '@essential-projects/iam_contracts';
import {DataModels, IManagementApi} from '@process-engine/management_api_contracts';

import {AuthenticationStateEvent, ISolutionEntry, ISolutionService, NotificationType} from '../../../contracts/index';
import environment from '../../../environment';
import {getBeautifiedDate} from '../../../services/date-service/date.service';
import {NotificationService} from '../../../services/notification-service/notification.service';

type ProcessInstanceWithCorrelation = {
  processInstance: DataModels.Correlations.CorrelationProcessInstance;
  correlation: DataModels.Correlations.Correlation;
};

@inject('ManagementApiClientService', EventAggregator, 'NotificationService', 'SolutionService', Router)
export class ProcessList {
  @observable public currentPage: number = 1;
  @bindable() public activeSolutionEntry: ISolutionEntry;
  public pageSize: number = 10;
  public totalItems: number;
  public paginationSize: number = 10;
  public requestSuccessful: boolean = false;
  public processInstancesToDisplay: Array<ProcessInstanceWithCorrelation> = [];

  private _managementApiService: IManagementApi;
  private _eventAggregator: EventAggregator;
  private _notificationService: NotificationService;
  private _solutionService: ISolutionService;
  private _activeSolutionUri: string;
  private _router: Router;

  private _pollingTimeout: NodeJS.Timer | number;
  private _subscriptions: Array<Subscription>;
  private _correlations: Array<DataModels.Correlations.Correlation> = [];
  private _processInstancesWithCorrelation: Array<ProcessInstanceWithCorrelation> = [];
  private _stoppedCorrelations: Array<DataModels.Correlations.Correlation> = [];
  private _stoppedProcessInstancesWithCorrelation: Array<ProcessInstanceWithCorrelation> = [];
  private _isAttached: boolean = false;

  constructor(
    managementApiService: IManagementApi,
    eventAggregator: EventAggregator,
    notificationService: NotificationService,
    solutionService: ISolutionService,
    router: Router,
  ) {
    this._managementApiService = managementApiService;
    this._eventAggregator = eventAggregator;
    this._notificationService = notificationService;
    this._solutionService = solutionService;
    this._router = router;
  }

  public activeSolutionEntryChanged(): void {
    this._stoppedCorrelations = [];
    this._stoppedProcessInstancesWithCorrelation = [];
  }

  public async currentPageChanged(newValue: number, oldValue: number): Promise<void> {
    const oldValueIsDefined: boolean = oldValue !== undefined && oldValue !== null;

    if (oldValueIsDefined) {
      this._updateCorrelationsToDisplay();
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
      const correlationListWasUpdated: boolean =
        JSON.stringify(correlations.sort(this._sortCorrelations)) !== JSON.stringify(this._correlations);

      if (correlationListWasUpdated) {
        this._correlations = correlations;
        this._correlations.sort(this._sortCorrelations);

        this._processInstancesWithCorrelation = [];
        for (const correlation of this._correlations) {
          const processInstancesWithCorrelation: Array<
            ProcessInstanceWithCorrelation
          > = correlation.processInstances.map(
            (processInstance: DataModels.Correlations.CorrelationProcessInstance) => {
              return {
                processInstance: processInstance,
                correlation: correlation,
              };
            },
          );

          this._processInstancesWithCorrelation.push(...processInstancesWithCorrelation);
        }

        this._updateCorrelationsToDisplay();
      }

      this.requestSuccessful = true;
    } catch (error) {
      this._notificationService.showNotification(
        NotificationType.ERROR,
        `Error receiving process list: ${error.message}`,
      );
      this.requestSuccessful = false;
    }

    const correlationsAreNotSet: boolean = this._correlations === undefined || this._correlations === null;
    if (correlationsAreNotSet) {
      this._correlations = [];
      this._processInstancesWithCorrelation = [];
    }

    this.totalItems = this._processInstancesWithCorrelation.length;
  }

  public async stopProcessInstance(
    processInstanceId: string,
    correlation: DataModels.Correlations.Correlation,
  ): Promise<void> {
    try {
      await this._managementApiService.terminateProcessInstance(this.activeSolutionEntry.identity, processInstanceId);

      const getStoppedCorrelation: Function = (): void => {
        setTimeout(async () => {
          const stoppedCorrelation: DataModels.Correlations.Correlation = await this._managementApiService.getCorrelationByProcessInstanceId(
            this.activeSolutionEntry.identity,
            processInstanceId,
          );

          const stoppedCorrelationIsNotStopped: boolean = stoppedCorrelation.state === 'running';
          if (stoppedCorrelationIsNotStopped) {
            return getStoppedCorrelation();
          }

          this._stoppedCorrelations.push(stoppedCorrelation);

          const processInstancesWithCorrelation: Array<
            ProcessInstanceWithCorrelation
          > = stoppedCorrelation.processInstances.map(
            (processInstance: DataModels.Correlations.CorrelationProcessInstance) => {
              return {
                processInstance: processInstance,
                correlation: stoppedCorrelation,
              };
            },
          );

          this._stoppedProcessInstancesWithCorrelation.push(...processInstancesWithCorrelation);
          // tslint:disable-next-line: no-magic-numbers
        }, 100);
      };

      getStoppedCorrelation();
      await this.updateCorrelationList();
    } catch (error) {
      this._notificationService.showNotification(NotificationType.ERROR, `Error while stopping Process! ${error}`);
    }
  }

  public formatDate(date: string): string {
    return getBeautifiedDate(date);
  }

  private async getAllActiveCorrelations(): Promise<Array<DataModels.Correlations.Correlation>> {
    const identity: IIdentity = this.activeSolutionEntry.identity;

    return this._managementApiService.getActiveCorrelations(identity);
  }

  private _startPolling(): void {
    this._pollingTimeout = setTimeout(async () => {
      await this.updateCorrelationList();

      if (this._isAttached) {
        this._startPolling();
      }
    }, environment.processengine.dashboardPollingIntervalInMs);
  }

  private _sortCorrelations(
    correlation1: DataModels.Correlations.Correlation,
    correlation2: DataModels.Correlations.Correlation,
  ): number {
    return Date.parse(correlation2.createdAt.toString()) - Date.parse(correlation1.createdAt.toString());
  }

  private _sortProcessInstancesWithCorrelation(
    firstProcessInstanceWithCorrelation: ProcessInstanceWithCorrelation,
    secondProcessInstanceWithCorrelation: ProcessInstanceWithCorrelation,
  ): number {
    const firstCorrelation: DataModels.Correlations.Correlation = firstProcessInstanceWithCorrelation.correlation;
    const secondCorrelation: DataModels.Correlations.Correlation = secondProcessInstanceWithCorrelation.correlation;

    const correlationsAreDifferent: boolean = firstCorrelation.id !== secondCorrelation.id;
    if (correlationsAreDifferent) {
      return Date.parse(secondCorrelation.createdAt.toString()) - Date.parse(firstCorrelation.createdAt.toString());
    }

    const firstProcessInstance: DataModels.Correlations.CorrelationProcessInstance =
      firstProcessInstanceWithCorrelation.processInstance;
    const secondProcessInstance: DataModels.Correlations.CorrelationProcessInstance =
      secondProcessInstanceWithCorrelation.processInstance;

    return (
      Date.parse(secondProcessInstance.createdAt.toString()) - Date.parse(firstProcessInstance.createdAt.toString())
    );
  }

  private _updateCorrelationsToDisplay(): void {
    const firstProcessInstanceIndex: number = (this.currentPage - 1) * this.pageSize;
    const lastProcessInstanceIndex: number = this.pageSize * this.currentPage;

    this.processInstancesToDisplay = this._processInstancesWithCorrelation;
    this.processInstancesToDisplay.push(...this._stoppedProcessInstancesWithCorrelation);
    this.processInstancesToDisplay.sort(this._sortProcessInstancesWithCorrelation);
    this.processInstancesToDisplay = this.processInstancesToDisplay.slice(
      firstProcessInstanceIndex,
      lastProcessInstanceIndex,
    );
  }
}
