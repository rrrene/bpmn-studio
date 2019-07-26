import { inject } from 'aurelia-framework';
import { activationStrategy } from 'aurelia-router';

import { ISolutionEntry, ISolutionService, NotificationType } from '../../contracts/index';
import { NotificationService } from '../../services/notification-service/notification.service';

export interface IThinkRouteParameters {
  view?: string;
  diagramName?: string;
  solutionUri?: string;
}

@inject('SolutionService', 'NotificationService')
export class Think {
  public showDiagramList: boolean = false;

  public activeSolutionEntry: ISolutionEntry;

  private _solutionService: ISolutionService;
  private _notificationService: NotificationService;

  private _diagramSelected: boolean = false;

  private _ipcRenderer: any;

  constructor(solutionService: ISolutionService, notificationService: NotificationService) {
    this._solutionService = solutionService;
    this._notificationService = notificationService;
  }

  public async canActivate(routeParameters: IThinkRouteParameters): Promise<boolean> {
    const solutionUriIsSet: boolean = routeParameters.solutionUri !== undefined;

    this._diagramSelected = routeParameters.diagramName !== undefined;

    const solutionUri: string = solutionUriIsSet
      ? routeParameters.solutionUri
      : window.localStorage.getItem('InternalProcessEngineRoute');

    this.activeSolutionEntry = this._solutionService.getSolutionEntryForUri(solutionUri);

    const noActiveSolution: boolean = this.activeSolutionEntry === undefined;
    if (noActiveSolution) {
      this._notificationService.showNotification(NotificationType.INFO, 'Please open a solution first.');

      return false;
    }

    await this.activeSolutionEntry.service.openSolution(
      this.activeSolutionEntry.uri,
      this.activeSolutionEntry.identity
    );

    return true;
  }

  public activate(): void {
    this.showDiagramList = true;

    const isRunningInElectron: boolean = Boolean((window as any).nodeRequire);

    if (isRunningInElectron) {
      this._ipcRenderer = (window as any).nodeRequire('electron').ipcRenderer;
      this._ipcRenderer.on('menubar__start_close_diagram', this._closeBpmnStudio);
    }
  }

  public deactivate(): void {
    const isRunningInElectron: boolean = Boolean((window as any).nodeRequire);

    if (isRunningInElectron) {
      this._ipcRenderer.removeListener('menubar__start_close_diagram', this._closeBpmnStudio);
    }
  }

  public determineActivationStrategy(): string {
    return activationStrategy.replace;
  }

  private _closeBpmnStudio: Function = (): void => {
    if (!this._diagramSelected) {
      this._ipcRenderer.send('close_bpmn-studio');
    }
  };
}
