import {EventAggregator, Subscription} from 'aurelia-event-aggregator';
import {bindable, inject, observable} from 'aurelia-framework';
import {Router} from 'aurelia-router';

import {IIdentity} from '@essential-projects/iam_contracts';
import {DataModels, IManagementApi} from '@process-engine/management_api_contracts';

import {AuthenticationStateEvent, ISolutionEntry, ISolutionService, NotificationType} from '../../../contracts/index';
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

  private managementApiService: IManagementApi;
  private eventAggregator: EventAggregator;
  private notificationService: NotificationService;
  private solutionService: ISolutionService;
  private activeSolutionUri: string;
  private router: Router;

  private pollingTimeout: NodeJS.Timer | number;
  private subscriptions: Array<Subscription>;
  private correlations: Array<DataModels.Correlations.Correlation> = [];
  private processInstancesWithCorrelation: Array<ProcessInstanceWithCorrelation> = [];
  private stoppedProcessInstancesWithCorrelation: Array<ProcessInstanceWithCorrelation> = [];
  private isAttached: boolean = false;

  constructor(
    managementApiService: IManagementApi,
    eventAggregator: EventAggregator,
    notificationService: NotificationService,
    solutionService: ISolutionService,
    router: Router,
  ) {
    this.managementApiService = managementApiService;
    this.eventAggregator = eventAggregator;
    this.notificationService = notificationService;
    this.solutionService = solutionService;
    this.router = router;
  }

  public activeSolutionEntryChanged(): void {
    this.stoppedProcessInstancesWithCorrelation = [];
  }

  public async currentPageChanged(newValue: number, oldValue: number): Promise<void> {
    const oldValueIsDefined: boolean = oldValue !== undefined && oldValue !== null;

    if (oldValueIsDefined) {
      this.updateCorrelationsToDisplay();
    }
  }

  public async attached(): Promise<void> {
    this.isAttached = true;
    this.activeSolutionUri = this.router.currentInstruction.queryParams.solutionUri;

    const activeSolutionUriIsNotSet: boolean = this.activeSolutionUri === undefined;

    if (activeSolutionUriIsNotSet) {
      this.activeSolutionUri = window.localStorage.getItem('InternalProcessEngineRoute');
    }

    const activeSolutionUriIsNotRemote: boolean = !this.activeSolutionUri.startsWith('http');
    if (activeSolutionUriIsNotRemote) {
      this.activeSolutionUri = window.localStorage.getItem('InternalProcessEngineRoute');
    }

    this.activeSolutionEntry = this.solutionService.getSolutionEntryForUri(this.activeSolutionUri);

    await this.updateCorrelationList();

    this.subscriptions = [
      this.eventAggregator.subscribe(AuthenticationStateEvent.LOGIN, () => {
        this.updateCorrelationList();
      }),
      this.eventAggregator.subscribe(AuthenticationStateEvent.LOGOUT, () => {
        this.updateCorrelationList();
      }),
    ];
  }

  public detached(): void {
    this.isAttached = false;
    clearTimeout(this.pollingTimeout as NodeJS.Timer);

    for (const subscription of this.subscriptions) {
      subscription.dispose();
    }
  }

  public async updateCorrelationList(): Promise<void> {
    try {
      const correlations: Array<DataModels.Correlations.Correlation> = await this.getAllActiveCorrelations();
      const correlationListWasUpdated: boolean =
        JSON.stringify(correlations.sort(this.sortCorrelations)) !== JSON.stringify(this.correlations);

      if (correlationListWasUpdated) {
        this.correlations = correlations;
        this.correlations.sort(this.sortCorrelations);

        this.processInstancesWithCorrelation = [];
        for (const correlation of this.correlations) {
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

          this.processInstancesWithCorrelation.push(...processInstancesWithCorrelation);
        }

        this.updateCorrelationsToDisplay();
      }

      this.requestSuccessful = true;
    } catch (error) {
      this.notificationService.showNotification(
        NotificationType.ERROR,
        `Error receiving process list: ${error.message}`,
      );
      this.requestSuccessful = false;
    }

    const correlationsAreNotSet: boolean = this.correlations === undefined || this.correlations === null;
    if (correlationsAreNotSet) {
      this.correlations = [];
      this.processInstancesWithCorrelation = [];
    }

    this.totalItems = this.processInstancesWithCorrelation.length;
  }

  public async stopProcessInstance(
    processInstance: DataModels.Correlations.CorrelationProcessInstance,
    correlation: DataModels.Correlations.Correlation,
  ): Promise<void> {
    try {
      await this.managementApiService.terminateProcessInstance(this.activeSolutionEntry.identity, processInstanceId);

      const getStoppedCorrelation: Function = (): void => {
        setTimeout(async () => {
          const stoppedCorrelation: DataModels.Correlations.Correlation = await this.managementApiService.getCorrelationByProcessInstanceId(
            this.activeSolutionEntry.identity,
            processInstanceId,
          );

          const stoppedCorrelationIsNotStopped: boolean = stoppedCorrelation.state === 'running';
          if (stoppedCorrelationIsNotStopped) {
            getStoppedCorrelation();

            return;
          }


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

          this.stoppedProcessInstancesWithCorrelation.push(...processInstancesWithCorrelation);
        }, 100);
      };

      getStoppedCorrelation();
      await this.updateCorrelationList();
    } catch (error) {
      this.notificationService.showNotification(NotificationType.ERROR, `Error while stopping Process! ${error}`);
    }
  }

  public formatDate(date: string): string {
    return getBeautifiedDate(date);
  }

  private async getAllActiveCorrelations(): Promise<Array<DataModels.Correlations.Correlation>> {
    const identity: IIdentity = this.activeSolutionEntry.identity;

    return this.managementApiService.getActiveCorrelations(identity);
  }

  private sortCorrelations(
    correlation1: DataModels.Correlations.Correlation,
    correlation2: DataModels.Correlations.Correlation,
  ): number {
    return Date.parse(correlation2.createdAt.toString()) - Date.parse(correlation1.createdAt.toString());
  }

  private sortProcessInstancesWithCorrelation(
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

  private updateCorrelationsToDisplay(): void {
    const firstProcessInstanceIndex: number = (this.currentPage - 1) * this.pageSize;
    const lastProcessInstanceIndex: number = this.pageSize * this.currentPage;

    this.processInstancesToDisplay = this.processInstancesWithCorrelation;
    this.processInstancesToDisplay.push(...this.stoppedProcessInstancesWithCorrelation);
    this.processInstancesToDisplay.sort(this.sortProcessInstancesWithCorrelation);
    this.processInstancesToDisplay = this.processInstancesToDisplay.slice(
      firstProcessInstanceIndex,
      lastProcessInstanceIndex,
    );
  }
}
