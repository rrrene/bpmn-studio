import {bindable, computedFrom, inject} from 'aurelia-framework';

import {ManagementApiClientService} from '@process-engine/management_api_client';
import {DataModels} from '@process-engine/management_api_contracts';

import {ISolutionEntry, NotificationType} from '../../../contracts/index';
import environment from '../../../environment';
import {DateService} from '../../../services/date-service/date.service';
import {NotificationService} from '../../../services/notification-service/notification.service';

@inject('ManagementApiClientService', 'NotificationService')
export class CronjobList {
  @bindable public activeSolutionEntry: ISolutionEntry;
  public requestSuccessful: boolean = false;
  public currentPage: number = 1;
  public pageSize: number = 10;
  public paginationSize: number = 10;

  private _managementApiService: ManagementApiClientService;

  private _cronjobs: Array<DataModels.Cronjobs.CronjobConfiguration> = [];
  private _pollingTimeout: NodeJS.Timeout;
  private _isAttached: boolean;
  private _notificationService: NotificationService;

  constructor(managementApiService: ManagementApiClientService, notificationService: NotificationService) {
    this._managementApiService = managementApiService;
    this._notificationService = notificationService;
  }

  public async attached(): Promise<void> {
    this._isAttached = true;

    await this.updateCronjobs();
    this._startPolling();
  }

  public detached(): void {
    this._isAttached = false;
    this._stopPolling();
  }

  @computedFrom('_cronjobs.length')
  public get totalItems(): number {
    return this._cronjobs.length;
  }

  @computedFrom('cronjobsToDisplay.length')
  public get showCronjobList(): boolean {
    return this.cronjobsToDisplay !== undefined && this.cronjobsToDisplay.length > 0;
  }

  public get cronjobsToDisplay(): Array<DataModels.Cronjobs.CronjobConfiguration> {
    const firstCronjobIndex: number = (this.currentPage - 1) * this.pageSize;
    const lastCronjobIndex: number = (this.pageSize * this.currentPage);

    const cronjobsToDisplay: Array<DataModels.Cronjobs.CronjobConfiguration> =
      [...this._cronjobs]
        .sort(this._sortCronjobs)
        .slice(firstCronjobIndex, lastCronjobIndex);

    return cronjobsToDisplay;
  }

  public getBeautifiedDate(date: Date): string {
    const beautifiedDate: string = new DateService(date)
                                        .year()
                                        .month()
                                        .day()
                                        .hours()
                                        .minutes()
                                        .seconds()
                                        .asFormattedDate();

    return beautifiedDate;
}

  public async updateCronjobs(): Promise<void> {
    try {
      this._cronjobs = await this._managementApiService.getAllActiveCronjobs(this.activeSolutionEntry.identity);

      this.requestSuccessful = true;
    } catch (error) {
      this._notificationService.showNotification(NotificationType.ERROR, `Error receiving process list: ${error.message}`);
      this.requestSuccessful = false;
    }
  }

  private _startPolling(): void {
    this._pollingTimeout = setTimeout(async() => {
      await this.updateCronjobs();

      if (this._isAttached) {
        this._startPolling();
      }
    }, environment.processengine.dashboardPollingIntervalInMs);
  }

  private _stopPolling(): void {
    clearTimeout(this._pollingTimeout);
  }

  private _sortCronjobs(
    firstCronjob: DataModels.Cronjobs.CronjobConfiguration,
    secondCronjob: DataModels.Cronjobs.CronjobConfiguration,
  ): number {
    return firstCronjob.nextExecution.getTime() - secondCronjob.nextExecution.getTime();
  }
}
