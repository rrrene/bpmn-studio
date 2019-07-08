import {bindable, inject} from 'aurelia-framework';
import {Router} from 'aurelia-router';

import {
  ForbiddenError,
  isError,
  UnauthorizedError,
} from '@essential-projects/errors_ts';
import {IIdentity} from '@essential-projects/iam_contracts';
import {IManagementApi} from '@process-engine/management_api_contracts';

import {ISolutionEntry, NotificationType} from '../../../contracts/index';
import {NotificationService} from '../../../services/notification-service/notification.service';

@inject('ManagementApiClientService', 'NotificationService', Router)
export class Dashboard {

  @bindable() public activeSolutionEntry: ISolutionEntry;
  public showTaskList: boolean = false;
  public showProcessList: boolean = false;
  public showCronjobList: boolean = false;

  private _managementApiService: IManagementApi;
  private _notificationService: NotificationService;
  private _router: Router;

  constructor(managementApiService: IManagementApi,
              notificationService: NotificationService,
              router: Router) {

    this._managementApiService = managementApiService;
    this._notificationService = notificationService;
    this._router = router;
  }

  public async canActivate(activeSolutionEntry: ISolutionEntry): Promise<boolean> {

    const hasClaimsForTaskList: boolean = await this._hasClaimsForTaskList(activeSolutionEntry.identity);
    const hasClaimsForProcessList: boolean = await this._hasClaimsForProcessList(activeSolutionEntry.identity);
    const hasClaimsForCronjobList: boolean = await this._hasClaimsForCronjobList(activeSolutionEntry.identity);

    if (!hasClaimsForProcessList && !hasClaimsForTaskList) {
      this._notificationService.showNotification(NotificationType.ERROR, 'You don\'t have the permission to use the dashboard features.');
      this._router.navigateToRoute('start-page');

      return false;
    }

    this.showTaskList = hasClaimsForTaskList;
    this.showProcessList = hasClaimsForProcessList;
    this.showCronjobList = hasClaimsForCronjobList;

    return true;
  }

  private async _hasClaimsForTaskList(identity: IIdentity): Promise<boolean> {
    try {
      // TODO: Refactor; this is not how we want to do our claim checks.
      // Talk to Sebastian or Christoph first.

      await this._managementApiService.getProcessModels(identity);
      await this._managementApiService.getActiveCorrelations(identity);

    } catch (error) {
      const errorIsForbiddenError: boolean = isError(error, ForbiddenError);
      const errorIsUnauthorizedError: boolean = isError(error, UnauthorizedError);

      if (errorIsForbiddenError || errorIsUnauthorizedError) {
        return false;
      }
    }

    return true;
  }

  private async _hasClaimsForProcessList(identity: IIdentity): Promise<boolean> {
    try {

      await this._managementApiService.getActiveCorrelations(identity);

    } catch (error) {
      const errorIsForbiddenError: boolean = isError(error, ForbiddenError);
      const errorIsUnauthorizedError: boolean = isError(error, UnauthorizedError);

      if (errorIsForbiddenError || errorIsUnauthorizedError) {
        return false;
      }
    }

    return true;
  }

  private async _hasClaimsForCronjobList(identity: IIdentity): Promise<boolean> {
    try {

      await this._managementApiService.getAllActiveCronjobs(identity);

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
