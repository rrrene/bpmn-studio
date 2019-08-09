import {EventAggregator, Subscription} from 'aurelia-event-aggregator';
import {bindable, inject} from 'aurelia-framework';
import {activationStrategy} from 'aurelia-router';

import {IDiagram} from '@process-engine/solutionexplorer.contracts';

import {ISolutionEntry, ISolutionService, InspectPanelTab, NotificationType} from '../../contracts/index';
import environment from '../../environment';
import {NotificationService} from '../../services/notification-service/notification.service';
import {Dashboard} from './dashboard/dashboard';

interface IInspectRouteParameters {
  view?: string;
  diagramName?: string;
  solutionUri?: string;
  processInstanceToSelect?: string;
  flowNodeToSelect?: string;
  inspectPanelTabToShow?: InspectPanelTab;
}

@inject(EventAggregator, 'SolutionService', 'NotificationService')
export class Inspect {
  @bindable() public showDashboard: boolean = true;
  @bindable() public activeDiagram: IDiagram;
  @bindable() public activeSolutionEntry: ISolutionEntry;

  public showHeatmap: boolean = false;
  public showInspectCorrelation: boolean = false;
  public dashboard: Dashboard;
  public showTokenViewer: boolean = false;
  public tokenViewerButtonDisabled: boolean = false;
  public processInstanceToSelect: string;
  public flowNodeToSelect: string;
  public inspectPanelTabToShow: InspectPanelTab;

  private eventAggregator: EventAggregator;
  private subscriptions: Array<Subscription>;
  private solutionService: ISolutionService;
  private notificationService: NotificationService;
  private ipcRenderer: any;

  constructor(
    eventAggregator: EventAggregator,
    solutionService: ISolutionService,
    notificationService: NotificationService,
  ) {
    this.eventAggregator = eventAggregator;
    this.solutionService = solutionService;
    this.notificationService = notificationService;
  }

  public determineActivationStrategy(): string {
    return activationStrategy.invokeLifecycle;
  }

  public canActivate(routeParameters: IInspectRouteParameters): boolean {
    const solutionUri: string = routeParameters.solutionUri
      ? routeParameters.solutionUri
      : window.localStorage.getItem('InternalProcessEngineRoute');

    this.activeSolutionEntry = this.solutionService.getSolutionEntryForUri(solutionUri);

    const noSolutionEntry: boolean = this.activeSolutionEntry === undefined;
    if (noSolutionEntry) {
      this.notificationService.showNotification(NotificationType.INFO, 'Please open a solution first.');

      return false;
    }

    return true;
  }

  public async activate(routeParameters: IInspectRouteParameters): Promise<void> {
    const solutionUri: string = routeParameters.solutionUri;
    const diagramName: string = routeParameters.diagramName;

    await this.updateInspectView(diagramName, solutionUri);

    const routeViewIsDashboard: boolean = routeParameters.view === 'dashboard';
    const routeViewIsHeatmap: boolean = routeParameters.view === 'heatmap';
    const routeViewIsInspectCorrelation: boolean = routeParameters.view === 'inspect-correlation';

    this.processInstanceToSelect = routeParameters.processInstanceToSelect;
    this.flowNodeToSelect = routeParameters.flowNodeToSelect;
    this.inspectPanelTabToShow = routeParameters.inspectPanelTabToShow;

    if (routeViewIsDashboard) {
      this.showHeatmap = false;
      this.showDashboard = true;
      this.showInspectCorrelation = false;

      setTimeout(() => {
        const dashboardIsAttached: boolean = this.dashboard !== undefined;

        if (dashboardIsAttached) {
          this.dashboard.canActivate(this.activeSolutionEntry);
        }
      }, 0);

      this.eventAggregator.publish(environment.events.navBar.toggleDashboardView);
    } else if (routeViewIsHeatmap) {
      this.eventAggregator.publish(environment.events.navBar.toggleHeatmapView);

      this.showDashboard = false;
      this.showHeatmap = true;
      this.showInspectCorrelation = false;
    } else if (routeViewIsInspectCorrelation) {
      this.eventAggregator.publish(environment.events.navBar.toggleInspectCorrelationView);

      this.showDashboard = false;
      this.showHeatmap = false;
      this.showInspectCorrelation = true;
    }

    const isRunningInElectron: boolean = Boolean((window as any).nodeRequire);

    if (isRunningInElectron) {
      this.ipcRenderer = (window as any).nodeRequire('electron').ipcRenderer;
      this.ipcRenderer.on('menubar__start_close_diagram', this.closeBpmnStudio);
    }
  }

  public deactivate(): void {
    const isRunningInElectron: boolean = Boolean((window as any).nodeRequire);

    if (isRunningInElectron) {
      this.ipcRenderer.removeListener('menubar__start_close_diagram', this.closeBpmnStudio);
    }
  }

  public attached(): void {
    const dashboardIsAttached: boolean = this.dashboard !== undefined;

    if (dashboardIsAttached) {
      this.dashboard.canActivate(this.activeSolutionEntry);
    }

    this.subscriptions = [
      this.eventAggregator.subscribe(
        environment.events.inspect.shouldDisableTokenViewerButton,
        (tokenViewerButtonDisabled: boolean) => {
          this.tokenViewerButtonDisabled = tokenViewerButtonDisabled;
        },
      ),
    ];
  }

  public detached(): void {
    this.eventAggregator.publish(environment.events.navBar.inspectNavigateToDashboard);

    for (const subscription of this.subscriptions) {
      subscription.dispose();
    }
  }

  public toggleShowTokenViewer(): void {
    if (this.tokenViewerButtonDisabled) {
      return;
    }

    this.showTokenViewer = !this.showTokenViewer;

    this.eventAggregator.publish(environment.events.inspectCorrelation.showTokenViewer, this.showTokenViewer);
  }

  private async updateInspectView(diagramName: string, solutionUri?: string): Promise<void> {
    const solutionUriIsSet: boolean = solutionUri !== undefined;

    const solutionUriToUse: string = solutionUriIsSet
      ? solutionUri
      : window.localStorage.getItem('InternalProcessEngineRoute');

    this.activeSolutionEntry = this.solutionService.getSolutionEntryForUri(solutionUriToUse);
    await this.activeSolutionEntry.service.openSolution(
      this.activeSolutionEntry.uri,
      this.activeSolutionEntry.identity,
    );

    const solutionIsRemote: boolean = solutionUriToUse.startsWith('http');
    if (solutionIsRemote) {
      this.eventAggregator.publish(
        environment.events.configPanel.solutionEntryChanged,
        this.solutionService.getSolutionEntryForUri(solutionUriToUse),
      );
    }

    const diagramIsSet: boolean = diagramName !== undefined;
    if (diagramIsSet) {
      const activeSolutionIsOpenSolution: boolean = solutionUriToUse === 'about:open-diagrams';
      if (activeSolutionIsOpenSolution) {
        const persistedDiagrams: Array<IDiagram> = this.solutionService.getOpenDiagrams();

        this.activeDiagram = persistedDiagrams.find((diagram: IDiagram) => {
          return diagram.name === diagramName;
        });
      } else {
        this.activeDiagram = await this.activeSolutionEntry.service.loadDiagram(diagramName);
      }
    }
  }

  private closeBpmnStudio: Function = (): void => {
    const activeDiagramNotSet: boolean = this.activeDiagram === undefined;
    if (activeDiagramNotSet) {
      this.ipcRenderer.send('close_bpmn-studio');
    }
  };
}
