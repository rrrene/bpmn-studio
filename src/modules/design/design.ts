/* tslint:disable:no-use-before-declare */
/**
 * We are disabling this rule here because we need this kind of statement in the
 * functions used in the promise of the modal.
*/

import {EventAggregator, Subscription} from 'aurelia-event-aggregator';
import {bindable, bindingMode, inject, observable} from 'aurelia-framework';
import {activationStrategy, NavigationInstruction, Redirect, Router} from 'aurelia-router';

import {IDiagram, ISolution} from '@process-engine/solutionexplorer.contracts';

import {ISolutionEntry, ISolutionService, NotificationType} from '../../contracts/index';
import environment from '../../environment';
import {NotificationService} from '../../services/notification-service/notification.service';
import {DiagramDetail} from './diagram-detail/diagram-detail';

export interface IDesignRouteParameters {
  view?: string;
  diagramName?: string;
  diagramUri?: string;
  solutionUri?: string;
}

type IEventListener = {
  name: string,
  function: Function,
};

type DiagramWithSolution = {
  diagram: IDiagram,
  solutionName: string,
  solutionUri: string,
};

@inject(EventAggregator, 'SolutionService', Router, 'NotificationService')
export class Design {

  @observable() public activeDiagram: IDiagram;
  @bindable() public activeSolutionEntry: ISolutionEntry;
  @bindable() public xmlForDiff: string;
  @bindable({defaultBindingMode: bindingMode.oneWay}) public xml: string;

  public showSelectDiagramModal: boolean = false;
  public showDetail: boolean = true;
  public showXML: boolean = false;
  public showDiff: boolean = false;
  public propertyPanelShown: boolean = false;
  public showPropertyPanelButton: boolean = true;
  public showDiffDestinationButton: boolean = false;
  public design: Design = this;

  public diagramDetail: DiagramDetail;
  public filteredSolutions: Array<ISolution> = [];
  public diagramArray: Array<IDiagram | object> = [];
  public selectedDiagram: DiagramWithSolution;

  private _eventAggregator: EventAggregator;
  private _notificationService: NotificationService;
  private _solutionService: ISolutionService;
  private _subscriptions: Array<Subscription>;
  private _router: Router;
  private _routeView: string;
  private _ipcRenderer: any;
  private _ipcRendererEventListeners: Array<IEventListener> = [];

  constructor(eventAggregator: EventAggregator, solutionService: ISolutionService, router: Router, notificationService: NotificationService) {
    this._eventAggregator = eventAggregator;
    this._solutionService = solutionService;
    this._router = router;
    this._notificationService = notificationService;
  }

  // TODO: Refactor this function
  // tslint:disable-next-line cyclomatic-complexity
  public async activate(routeParameters: IDesignRouteParameters): Promise<void> {
    const solutionIsSet: boolean = routeParameters.solutionUri !== undefined;
    const diagramNameIsSet: boolean = routeParameters.diagramName !== undefined;

    const routerAndInstructionIsNotNull: boolean = this._router !== null
                                                && this._router.currentInstruction !== null;

    const diagramNamesAreDifferent: boolean = routerAndInstructionIsNotNull
                                              ? routeParameters.diagramName !== this._router.currentInstruction.params.diagramName
                                              : true;

    const diagramUrisAreDifferent: boolean = routerAndInstructionIsNotNull
                                             ? routeParameters.diagramUri !== this._router.currentInstruction.queryParams.diagramUri
                                             || routeParameters.diagramUri === undefined
                                             : false;

    const solutionIsDifferent: boolean = routerAndInstructionIsNotNull
                                        ? routeParameters.solutionUri !== this._router.currentInstruction.queryParams.solutionUri
                                        : true;

    const routeFromOtherView: boolean = routerAndInstructionIsNotNull
                                      ? this._router.currentInstruction.config.name !== 'design'
                                      : true;

    const navigateToAnotherDiagram: boolean = diagramNamesAreDifferent || diagramUrisAreDifferent || routeFromOtherView || solutionIsDifferent;

    if (solutionIsSet) {
      this.activeSolutionEntry = this._solutionService.getSolutionEntryForUri(routeParameters.solutionUri);

      /**
       * We have to open the solution here again since if we come here after a
       * reload the solution might not be opened yet.
       */
      await this.activeSolutionEntry.service.openSolution(this.activeSolutionEntry.uri, this.activeSolutionEntry.identity);

      const solutionIsRemote: boolean = this.activeSolutionEntry.uri.startsWith('http');
      if (solutionIsRemote) {
        this._eventAggregator.publish(environment.events.configPanel.processEngineRouteChanged, this.activeSolutionEntry.uri);
      }

      const isOpenDiagram: boolean = this.activeSolutionEntry.uri === 'about:open-diagrams';

      if (isOpenDiagram) {
        const persistedDiagrams: Array<IDiagram> = this._solutionService.getOpenDiagrams();

        this.activeDiagram = persistedDiagrams.find((diagram: IDiagram) => {
          return diagram.name === routeParameters.diagramName &&
                 (diagram.uri === routeParameters.diagramUri || routeParameters.diagramUri === undefined);
        });

      } else {

        this.activeDiagram = diagramNameIsSet
                            ? await this.activeSolutionEntry.service.loadDiagram(routeParameters.diagramName)
                            : undefined;
      }

      const diagramNotFound: boolean = this.activeDiagram === undefined;

      if (diagramNotFound) {
        this._router.navigateToRoute('start-page');
        this._notificationService.showNotification(NotificationType.INFO, 'Diagram could not be opened!');
      }

      if (navigateToAnotherDiagram) {
        this.xml = this.activeDiagram.xml;
      }
    }

    const routeViewIsDetail: boolean = routeParameters.view === 'detail';
    const routeViewIsXML: boolean = routeParameters.view === 'xml';
    const routeViewIsDiff: boolean = routeParameters.view === 'diff';
    this._routeView = routeParameters.view;

    if (routeViewIsDetail) {
      this.showDetail = true;
      this.showXML = false;
      this.showDiff = false;
      this.showPropertyPanelButton = true;
      this.showDiffDestinationButton = false;

      this._eventAggregator.publish(environment.events.bpmnio.bindKeyboard);

    } else if (routeViewIsXML) {
      this.showDetail = false;
      this.showXML = true;
      this.showDiff = false;
      this.showDiffDestinationButton = false;
      this.showPropertyPanelButton = false;

      this._eventAggregator.publish(environment.events.bpmnio.unbindKeyboard);
    } else if (routeViewIsDiff) {
      this._eventAggregator.publish(environment.events.bpmnio.unbindKeyboard);
      /**
       * We need to check this, because after a reload the diagramdetail component is not attached yet.
       */
      const diagramDetailIsNotAttached: boolean = this.diagramDetail === undefined;
      if (diagramDetailIsNotAttached) {
        this.xmlForDiff = this.activeDiagram.xml;
        return;
      }

      this.xmlForDiff = await this.diagramDetail.getXML();

      this._showDiff();
    }

    this._eventAggregator.publish(environment.events.navBar.noValidationError);
  }

  public async attached(): Promise<void> {
    const routeViewIsDiff: boolean = this._routeView === 'diff';
    const routeViewIsXML: boolean = this._routeView === 'xml';

    if (routeViewIsDiff) {
      this._showDiff();
    }

    if (routeViewIsDiff || routeViewIsXML) {
      this._eventAggregator.publish(environment.events.bpmnio.unbindKeyboard);
    }

    this._subscriptions = [
      this._eventAggregator.subscribe(environment.events.bpmnio.propertyPanelActive, (showPanel: boolean) => {
        this.propertyPanelShown = showPanel;
      }),
    ];

    this._eventAggregator.publish(environment.events.statusBar.showDiagramViewButtons);
  }

  public detached(): void {
    this._eventAggregator.publish(environment.events.statusBar.hideDiagramViewButtons);
    this._subscriptions.forEach((subscription: Subscription) => subscription.dispose());
  }

  public determineActivationStrategy(): string {

    return activationStrategy.invokeLifecycle;
  }

  public setDiffDestination(diffDestination: string, diagramName?: string): void {
    this._eventAggregator.publish(environment.events.diffView.setDiffDestination,
      [
        diffDestination,
        diagramName,
      ]);

    this.showSelectDiagramModal = false;
  }

  public async openSelectDiagramModal(): Promise<void> {
    this.diagramArray = [];

    const allSolutions: Array<ISolutionEntry> = this._solutionService.getAllSolutionEntries();

    const loadedSolutionPromises: Array<Promise<ISolution>> = allSolutions.map(async(value: ISolutionEntry) => {
      const loadedSolution: ISolution = await value.service.loadSolution();

      return loadedSolution;
    });

    const loadedSolutions: Array<ISolution> = await Promise.all(loadedSolutionPromises);
    this.filteredSolutions = loadedSolutions.filter((solution: ISolution) => {

      return solution.diagrams.length !== 0;
    });

    loadedSolutions.forEach((solution: ISolution) => {
      solution.diagrams.forEach((diagram: IDiagram) => {
        const diagramWithSolutionName: DiagramWithSolution = {
          diagram,
          solutionName: solution.name,
          solutionUri: solution.uri,
        };

        this.diagramArray.push(diagramWithSolutionName);
      });
    });

    const lastSaved: DiagramWithSolution = {
      diagram: this.activeDiagram,
      solutionName: 'Last Saved',
      solutionUri: 'lastSaved',
    };

    this.diagramArray.unshift(lastSaved);

    const openedDiagramIndex: number = this.diagramArray.findIndex((diagram: DiagramWithSolution) => {
      const diagramIsOpenedDiagram: boolean = diagram.solutionUri === this.activeSolutionEntry.uri
                                           && diagram.diagram.name === this.activeDiagram.name;
      return diagramIsOpenedDiagram;
    });

    this.diagramArray.splice(openedDiagramIndex, 1);

    this.showSelectDiagramModal = true;
  }

  public cancelDialog(): void {
    this.showSelectDiagramModal = false;
  }

  public togglePanel(): void {
    this._eventAggregator.publish(environment.events.bpmnio.togglePropertyPanel);
  }

  public deactivate(): void {
    this.diagramDetail.deactivate();

    for (const eventListener of this._ipcRendererEventListeners) {
      this._ipcRenderer.removeListener(eventListener.name, eventListener.function);
    }
  }

  public activeDiagramChanged(newValue: IDiagram, oldValue: IDiagram): void {
    const noOldValue: boolean = oldValue === undefined;
    if (noOldValue) {
      return;
    }

    const activeDiagramDidNotChange: boolean = newValue.id === oldValue.id
                                            && newValue.uri === oldValue.uri;
    if (activeDiagramDidNotChange) {
      return;
    }

    this.xml = newValue.xml;
    this.xmlForDiff = newValue.xml;
  }

  public get connectedRemoteSolutions(): Array<ISolutionEntry> {
    const remoteSolutions: Array<ISolutionEntry> = this._solutionService.getRemoteSolutionEntries();

    const remoteSolutionsWithoutActive: Array<ISolutionEntry> = remoteSolutions.filter((remoteSolution: ISolutionEntry) => {
      return remoteSolution.uri !== this.activeSolutionEntry.uri && remoteSolution.fontAwesomeIconClass !== 'fa-bolt';
    });

    return remoteSolutionsWithoutActive;
  }

  public get remoteSolutions(): Array<ISolutionEntry> {
    const remoteSolutions: Array<ISolutionEntry> = this._solutionService.getRemoteSolutionEntries();

    const remoteSolutionsWithoutActive: Array<ISolutionEntry> = remoteSolutions.filter((remoteSolution: ISolutionEntry) => {
      return remoteSolution.uri !== this.activeSolutionEntry.uri;
    });

    return remoteSolutionsWithoutActive;
  }

  public get showSaveBeforeDeployModal(): boolean {
    return this.diagramDetail.showSaveBeforeDeployModal;
  }

  public get showRemoteSolutionOnDeployModal(): boolean {
    return this.diagramDetail.showRemoteSolutionOnDeployModal;
  }

  public get showSaveForStartModal(): boolean {
    return this.diagramDetail.showSaveForStartModal;
  }

  public get showStartWithOptionsModal(): boolean {
    return this.diagramDetail.showStartWithOptionsModal;
  }

  public get showStartEventModal(): boolean {
    return this.diagramDetail.showStartEventModal;
  }

  public get diagramHasChanged(): boolean {
    return this.diagramDetail.diagramHasChanged;
  }

  private _showDiff(): void {
    this.showDiff = true;
    this.showDetail = false;
    this.showXML = false;
    this.showPropertyPanelButton = false;
    this.showDiffDestinationButton = true;
  }

  /**
   * This function checks, if the 'Save unsaved changes' Modal can be
   * suppressed.
   *
   * This is the case, if the user basically navigates between the detail,
   * the xml and the diff view, since the current xml will passed between
   * these views.
   *
   * Therefore, the following paths will suppress the modal:
   *  * detail  <-->   xml
   *  * detail  <-->   diff
   *  * diff    <-->   xml
   *
   * @param destinationInstruction The current router instruction which contains
   * the destination router parameters.
   */
  private _modalCanBeSuppressed(destinationInstruction: NavigationInstruction): boolean {
    const oldView: string = this._router.currentInstruction.params.view;
    const destinationView: string = destinationInstruction.params.view;

    const navigatingBetween: Function = (routeA: string, routeB: string): boolean =>
      (routeA === oldView || routeA === destinationView) && (routeB === oldView || routeB === destinationView);

    const shouldModalBeSuppressed: boolean = navigatingBetween('diff', 'xml')
      || navigatingBetween('diff', 'detail')
      || navigatingBetween('xml', 'detail');

    return shouldModalBeSuppressed;
  }
}
