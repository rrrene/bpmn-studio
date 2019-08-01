import {bindable, inject} from 'aurelia-framework';
import {Router} from 'aurelia-router';

import {ForbiddenError, UnauthorizedError, isError} from '@essential-projects/errors_ts';
import {IIdentity} from '@essential-projects/iam_contracts';
import {IManagementApi} from '@process-engine/management_api_contracts';

import {ISolutionEntry, NotificationType} from '../../../contracts/index';
import {NotificationService} from '../../../services/notification-service/notification.service';

const versionRegex: RegExp = /(\d+)\.(\d+).(\d+)/;

@inject('ManagementApiClientService', 'NotificationService', Router)
export class Dashboard {
  @bindable() public activeSolutionEntry: ISolutionEntry;
  public showTaskList: boolean = false;
  public showProcessList: boolean = false;
  public showCronjobList: boolean = false;

  private managementApiService: IManagementApi;
  private notificationService: NotificationService;
  private router: Router;

  constructor(managementApiService: IManagementApi, notificationService: NotificationService, router: Router) {
    this.managementApiService = managementApiService;
    this.notificationService = notificationService;
    this.router = router;
  }

  public async canActivate(activeSolutionEntry: ISolutionEntry): Promise<boolean> {
    const hasClaimsForTaskList: boolean = await this.hasClaimsForTaskList(activeSolutionEntry.identity);
    const hasClaimsForProcessList: boolean = await this.hasClaimsForProcessList(activeSolutionEntry.identity);
    const hasClaimsForCronjobList: boolean = await this.hasClaimsForCronjobList(activeSolutionEntry.identity);

    if (!hasClaimsForProcessList && !hasClaimsForTaskList) {
      this.notificationService.showNotification(
        NotificationType.ERROR,
        "You don't have the permission to use the dashboard features.",
      );
      this.router.navigateToRoute('start-page');

      return false;
    }

    this.showTaskList = hasClaimsForTaskList;
    this.showProcessList = hasClaimsForProcessList;
    this.showCronjobList = hasClaimsForCronjobList && this.processEngineSupportsCronjob();

    return true;
  }

  private processEngineSupportsCronjob(): boolean {
    const processEngineVersion: string = this.activeSolutionEntry.processEngineVersion;

    const noProcessEngineVersionSet: boolean = processEngineVersion === undefined;
    if (noProcessEngineVersionSet) {
      return false;
    }

    const regexResult: RegExpExecArray = versionRegex.exec(processEngineVersion);
    const majorVersion: number = parseInt(regexResult[1]);
    const minorVersion: number = parseInt(regexResult[2]);

    // The version must be 8.4.0 or later
    const processEngineSupportsEvents: boolean = majorVersion > 8 || (majorVersion === 8 && minorVersion >= 4);

    return processEngineSupportsEvents;
  }

  private async hasClaimsForTaskList(identity: IIdentity): Promise<boolean> {
    try {
      // TODO: Refactor; this is not how we want to do our claim checks.
      // Talk to Sebastian or Christoph first.

      await this.managementApiService.getProcessModels(identity);
      await this.managementApiService.getActiveCorrelations(identity);
    } catch (error) {
      const errorIsForbiddenError: boolean = isError(error, ForbiddenError);
      const errorIsUnauthorizedError: boolean = isError(error, UnauthorizedError);

      if (errorIsForbiddenError || errorIsUnauthorizedError) {
        return false;
      }
    }

    return true;
  }

  private async hasClaimsForProcessList(identity: IIdentity): Promise<boolean> {
    try {
      await this.managementApiService.getActiveCorrelations(identity);
    } catch (error) {
      const errorIsForbiddenError: boolean = isError(error, ForbiddenError);
      const errorIsUnauthorizedError: boolean = isError(error, UnauthorizedError);

      if (errorIsForbiddenError || errorIsUnauthorizedError) {
        return false;
      }
    }

    return true;
  }

  private async hasClaimsForCronjobList(identity: IIdentity): Promise<boolean> {
    try {
      await this.managementApiService.getAllActiveCronjobs(identity);
    } catch (error) {
      const errorIsForbiddenError: boolean = isError(error, ForbiddenError);
      const errorIsUnauthorizedError: boolean = isError(error, UnauthorizedError);

      if (errorIsForbiddenError || errorIsUnauthorizedError) {
        return false;
      }
    }

    return true;
  }
}
