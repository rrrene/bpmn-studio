import {bindable, computedFrom, inject} from 'aurelia-framework';

import {ManagementApiClientService} from '@process-engine/management_api_client';
import {DataModels} from '@process-engine/management_api_contracts';

import {ISolutionEntry, NotificationType} from '../../../contracts/index';
import environment from '../../../environment';
import {getBeautifiedDate} from '../../../services/date-service/date.service';
import {NotificationService} from '../../../services/notification-service/notification.service';

@inject('ManagementApiClientService', 'NotificationService')
export class CronjobList {
  @bindable public activeSolutionEntry: ISolutionEntry;
  public requestSuccessful: boolean = false;
  public currentPage: number = 1;
  public pageSize: number = 10;
  public paginationSize: number = 10;

  private managementApiService: ManagementApiClientService;

  private cronjobs: Array<DataModels.Cronjobs.CronjobConfiguration> = [];
  private pollingTimeout: NodeJS.Timeout;
  private isAttached: boolean;
  private notificationService: NotificationService;

  constructor(managementApiService: ManagementApiClientService, notificationService: NotificationService) {
    this.managementApiService = managementApiService;
    this.notificationService = notificationService;
  }

  public async attached(): Promise<void> {
    this.isAttached = true;

    await this.updateCronjobs();
    this.startPolling();
  }

  public detached(): void {
    this.isAttached = false;
    this.stopPolling();
  }

  @computedFrom('cronjobs.length')
  public get totalItems(): number {
    return this.cronjobs.length;
  }

  @computedFrom('cronjobsToDisplay.length')
  public get showCronjobList(): boolean {
    return this.cronjobsToDisplay !== undefined && this.cronjobsToDisplay.length > 0;
  }

  public get cronjobsToDisplay(): Array<DataModels.Cronjobs.CronjobConfiguration> {
    const firstCronjobIndex: number = (this.currentPage - 1) * this.pageSize;
    const lastCronjobIndex: number = this.pageSize * this.currentPage;

    const cronjobsToDisplay: Array<DataModels.Cronjobs.CronjobConfiguration> = [...this.cronjobs]
      .sort(this.sortCronjobs)
      .slice(firstCronjobIndex, lastCronjobIndex);

    return cronjobsToDisplay;
  }

  public getBeautifiedDate(date: Date): string {
    const beautifiedDate: string = getBeautifiedDate(date);

    return beautifiedDate;
  }

  public async updateCronjobs(): Promise<void> {
    try {
      this.cronjobs = await this.managementApiService.getAllActiveCronjobs(this.activeSolutionEntry.identity);

      this.requestSuccessful = true;
    } catch (error) {
      this.notificationService.showNotification(
        NotificationType.ERROR,
        `Error receiving process list: ${error.message}`,
      );
      this.requestSuccessful = false;
    }
  }

  private startPolling(): void {
    this.pollingTimeout = setTimeout(async () => {
      await this.updateCronjobs();

      if (this.isAttached) {
        this.startPolling();
      }
    }, environment.processengine.dashboardPollingIntervalInMs);
  }

  private stopPolling(): void {
    clearTimeout(this.pollingTimeout);
  }

  private sortCronjobs(
    firstCronjob: DataModels.Cronjobs.CronjobConfiguration,
    secondCronjob: DataModels.Cronjobs.CronjobConfiguration,
  ): number {
    return firstCronjob.nextExecution.getTime() - secondCronjob.nextExecution.getTime();
  }
}
