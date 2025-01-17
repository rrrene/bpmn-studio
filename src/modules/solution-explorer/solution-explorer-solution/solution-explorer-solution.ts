/* eslint-disable max-lines */
import {EventAggregator, Subscription} from 'aurelia-event-aggregator';
import {NewInstance, bindable, computedFrom, inject} from 'aurelia-framework';
import {Router} from 'aurelia-router';
import {ControllerValidateResult, ValidateResult, ValidationController, ValidationRules} from 'aurelia-validation';

import {ForbiddenError, UnauthorizedError, isError} from '@essential-projects/errors_ts';
import {IDiagram, ISolution} from '@process-engine/solutionexplorer.contracts';
import {ISolutionExplorerService} from '@process-engine/solutionexplorer.service.contracts';
import {join} from 'path';

import {IIdentity} from '@essential-projects/iam_contracts';
import {
  IDiagramCreationService,
  IDiagramState,
  IDiagramStateList,
  ISolutionEntry,
  ISolutionService,
  NotificationType,
} from '../../../contracts/index';
import environment from '../../../environment';
import {NotificationService} from '../../../services/notification-service/notification.service';
import {OpenDiagramsSolutionExplorerService} from '../../../services/solution-explorer-services/OpenDiagramsSolutionExplorerService';
import {OpenDiagramStateService} from '../../../services/solution-explorer-services/OpenDiagramStateService';
import {DeleteDiagramModal} from './delete-diagram-modal/delete-diagram-modal';

const ENTER_KEY: string = 'Enter';
const ESCAPE_KEY: string = 'Escape';

type DiagramSorter = (firstElement: IDiagram, secondElement: IDiagram) => number;

enum CloseModalResult {
  Cancel = 0,
  Save = 1,
  Delete = 2,
}

interface IDiagramNameInputState {
  currentDiagramInputValue: string;
}

interface IDiagramCreationState extends IDiagramNameInputState {
  isCreateDiagramInputShown: boolean;
}

@inject(
  Router,
  EventAggregator,
  NewInstance.of(ValidationController),
  'DiagramCreationService',
  'NotificationService',
  'SolutionService',
  'OpenDiagramStateService',
)
export class SolutionExplorerSolution {
  public activeDiagram: IDiagram;
  public showCloseModal: boolean = false;
  @bindable public renameDiagramInput: HTMLInputElement;

  // Fields below are bound from the html view.
  @bindable public solutionService: ISolutionExplorerService;
  @bindable public openDiagramService: OpenDiagramsSolutionExplorerService;
  @bindable public displayedSolutionEntry: ISolutionEntry;
  @bindable public fontAwesomeIconClass: string;
  public createNewDiagramInput: HTMLInputElement;
  public diagramContextMenu: HTMLElement;
  public showContextMenu: boolean = false;
  public deleteDiagramModal: DeleteDiagramModal;
  public processEngineRunning: boolean = false;

  private router: Router;
  private eventAggregator: EventAggregator;
  private validationController: ValidationController;
  private diagramCreationService: IDiagramCreationService;
  private notificationService: NotificationService;
  private openDiagramStateService: OpenDiagramStateService;

  private diagramRoute: string = 'design';
  private inspectView: string;
  private designView: string = 'detail';
  private subscriptions: Array<Subscription>;
  private openedSolution: ISolution;
  private diagramCreationState: IDiagramCreationState = {
    currentDiagramInputValue: undefined,
    isCreateDiagramInputShown: false,
  };

  private diagramRenamingState: IDiagramNameInputState = {
    currentDiagramInputValue: undefined,
  };

  private refreshTimeoutTask: NodeJS.Timer | number;

  private diagramValidationRegExpList: Array<RegExp> = [/^[a-z0-9]/i, /^[._ -]/i, /^[äöüß]/i];

  private currentlyRenamingDiagram: IDiagram | null = null;
  private isAttached: boolean = false;

  private originalIconClass: string;
  private globalSolutionService: ISolutionService;
  private diagramInContextMenu: IDiagram;
  private ipcRenderer: any;

  private sortedDiagramsOfSolutions: Array<IDiagram> = [];

  constructor(
    router: Router,
    eventAggregator: EventAggregator,
    validationController: ValidationController,
    diagramCreationService: IDiagramCreationService,
    notificationService: NotificationService,
    solutionService: ISolutionService,
    openDiagramStateService: OpenDiagramStateService,
  ) {
    this.router = router;
    this.eventAggregator = eventAggregator;
    this.validationController = validationController;
    this.diagramCreationService = diagramCreationService;
    this.notificationService = notificationService;
    this.globalSolutionService = solutionService;
    this.openDiagramStateService = openDiagramStateService;
  }

  public async attached(): Promise<void> {
    this.isAttached = true;
    if ((window as any).nodeRequire) {
      this.ipcRenderer = (window as any).nodeRequire('electron').ipcRenderer;
    }

    this.originalIconClass = this.fontAwesomeIconClass;
    this.updateSolutionExplorer();

    this.subscriptions = [
      this.eventAggregator.subscribe('router:navigation:success', () => {
        this.updateSolutionExplorer();
      }),
    ];

    if (this.displayedSolutionEntry.isOpenDiagramService) {
      const updateSubscription: Subscription = this.eventAggregator.subscribe(
        environment.events.solutionExplorer.updateOpenDiagrams,
        (): void => {
          this.updateSolution();
        },
      );

      this.subscriptions.push(updateSubscription);

      if ((window as any).nodeRequire) {
        this.ipcRenderer.on('menubar__start_close_diagram', this.closeDiagramEventFunction);
        this.ipcRenderer.on('menubar__start_close_all_diagrams', this.closeAllDiagramsEventFunction);
        this.ipcRenderer.on('menubar__start_save_all_diagrams', this.saveAllDiagramsEventFunction);
      }
    }

    const solutionIsRemoteSolution: boolean = this.displayedSolutionEntry.uri.startsWith('http');
    if (solutionIsRemoteSolution && (window as any).nodeRequire) {
      this.ipcRenderer.on('menubar__start_close_diagram', this.closeDiagramEventFunction);
    }

    if (this.displayedSolutionEntry.uri.startsWith('http')) {
      await this.waitForProcessEngine();
    } else {
      this.processEngineRunning = true;
      this.setValidationRules();

      setTimeout(async () => {
        await this.updateSolution();
        this.startPolling();
      }, 0);
    }
  }

  public waitForProcessEngine(): Promise<boolean> {
    return new Promise((resolve: Function, reject: Function): void => {
      const makeRequest: Function = (): void => {
        setTimeout(async () => {
          try {
            await fetch(this.displayedSolutionEntry.uri);

            this.processEngineRunning = true;

            await this.updateSolution();

            this.startPolling();

            resolve(true);
          } catch (error) {
            makeRequest();
          }
          // tslint:disable-next-line: no-magic-numbers
        }, 10);
      };

      makeRequest();
    });
  }

  public detached(): void {
    this.isAttached = false;

    clearTimeout(this.refreshTimeoutTask as NodeJS.Timer);

    this.disposeSubscriptions();

    if (this.diagramCreationState.isCreateDiagramInputShown) {
      this.resetDiagramCreation();
    }

    if (this.isCurrentlyRenamingDiagram) {
      this.resetDiagramRenaming();
    }

    if (this.displayedSolutionEntry.isOpenDiagramService) {
      this.ipcRenderer.removeListener('menubar__start_close_diagram', this.closeDiagramEventFunction);
      this.ipcRenderer.removeListener('menubar__start_close_all_diagrams', this.closeAllDiagramsEventFunction);
      this.ipcRenderer.removeListener('menubar__start_save_all_diagrams', this.saveAllDiagramsEventFunction);
    }
  }

  public async showDeleteDiagramModal(diagram: IDiagram, event: Event): Promise<void> {
    /**
     * We are stopping the event propagation here, because we don't want
     * the event to be called on the list element, since this would lead to a
     * navigation to the diagram we want to delete.
     */
    event.stopPropagation();

    const diagramWasDeleted: boolean = await this.deleteDiagramModal.show(diagram, this.solutionService);

    if (diagramWasDeleted) {
      await this.updateSolution();
      this.refreshDisplayedDiagrams();
    }
  }

  /**
   * Called by aurelia, if the value of the solutionService binding changes.
   */
  public solutionServiceChanged(newValue: ISolutionExplorerService, oldValue: ISolutionExplorerService): Promise<void> {
    if (!this.processEngineRunning) {
      return undefined;
    }

    return this.updateSolution();
  }

  /**
   * Reload the solution by requesting it from the solution service.
   */
  public async updateSolution(): Promise<void> {
    try {
      this.openedSolution = await this.solutionService.loadSolution();

      const updatedDiagramList: Array<IDiagram> = this.displayedSolutionEntry.isOpenDiagramService
        ? this.openedSolution.diagrams
        : this.openedSolution.diagrams.sort(this.diagramSorter);

      const diagramsOfSolutionChanged: boolean =
        this.sortedDiagramsOfSolutions.toString() !== updatedDiagramList.toString();
      if (diagramsOfSolutionChanged) {
        this.refreshDisplayedDiagrams();
      }

      this.fontAwesomeIconClass = this.originalIconClass;
      this.processEngineRunning = true;
    } catch (error) {
      // In the future we can maybe display a small icon indicating the error.
      if (isError(error, UnauthorizedError)) {
        this.notificationService.showNotification(NotificationType.ERROR, 'You need to login to list process models.');
      } else if (isError(error, ForbiddenError)) {
        this.notificationService.showNotification(
          NotificationType.ERROR,
          "You don't have the required permissions to list process models.",
        );
      } else {
        this.openedSolution.diagrams = undefined;
        this.fontAwesomeIconClass = 'fa-bolt';
        this.processEngineRunning = false;
      }
    }
  }

  /*
   * Used when this is a open diagram solution explorer service.
   */
  public async closeDiagram(diagram: IDiagram, event?: Event): Promise<void> {
    const eventSet: boolean = event !== undefined;
    if (eventSet) {
      event.stopPropagation();
    }

    const diagramState: IDiagramState = this.openDiagramStateService.loadDiagramState(diagram.uri);
    const diagramHasUnsavedChanges: boolean = diagramState !== null && diagramState.metaData.isChanged;

    if (diagramHasUnsavedChanges) {
      const cancelClosing: boolean = (await this.showCloseDiagramModal(diagram)) === CloseModalResult.Cancel;

      if (cancelClosing) {
        return undefined;
      }
    }

    const closedDiagramWasActiveDiagram: boolean = this.activeDiagramUri === diagram.uri;
    if (closedDiagramWasActiveDiagram) {
      return new Promise<void>((resolve: Function): void => {
        const subscription: Subscription = this.eventAggregator.subscribe('router:navigation:success', () => {
          this.closeOpenDiagram(diagram);
          subscription.dispose();

          resolve();
        });

        this.router.navigateToRoute('start-page');
      });
    }

    this.closeOpenDiagram(diagram);
    return undefined;
  }

  public async startRenamingOfDiagram(diagram: IDiagram, event: Event): Promise<void> {
    event.stopPropagation();

    if (await this.isDiagramDetailViewOfDiagramOpen(diagram.uri)) {
      const messageTitle: string = '<h4 class="toast-message__headline">Not supported while opened.</h4>';
      const messageBody: string =
        'Renaming of opened diagrams is currently not supported. Please switch to another diagram and try again.';
      const message: string = `${messageTitle}\n${messageBody}`;

      this.notificationService.showNotification(NotificationType.INFO, message, {
        toastClass: 'toast-not-allowed-renaming-or-deleting',
      });

      return;
    }

    if (this.isCurrentlyRenamingDiagram) {
      return;
    }

    // Dont allow renaming diagram, if already creating another.
    if (this.diagramCreationState.isCreateDiagramInputShown) {
      return;
    }

    // This shows the input field.
    this.currentlyRenamingDiagram = diagram;

    // The templating update must happen before we can set the focus.
    window.setTimeout(() => {
      this.renameDiagramInput.focus();
      this.diagramRenamingState.currentDiagramInputValue = diagram.name;
      this.setValidationRules();
      this.validationController.validate();
    }, 0);

    document.addEventListener('click', this.onRenameDiagramClickEvent);
    document.addEventListener('keyup', this.onRenameDiagramKeyupEvent);
  }

  public activateContextMenu(event: MouseEvent, diagram: IDiagram): void {
    this.diagramInContextMenu = diagram;

    this.diagramContextMenu.style.top = `${event.y}px`;
    this.diagramContextMenu.style.left = `${event.x}px`;
    this.showContextMenu = true;

    const documentEventListener: EventListenerOrEventListenerObject = (): void => {
      this.showContextMenu = false;
      this.diagramInContextMenu = undefined;

      document.removeEventListener('click', documentEventListener);
    };

    document.addEventListener('click', documentEventListener);
  }

  public async duplicateDiagram(): Promise<void> {
    const noDiagramInContextMenu: boolean = this.diagramInContextMenu === undefined;
    if (noDiagramInContextMenu) {
      return;
    }

    let newNameFound: boolean = false;
    let newName: string;
    let diagramNumber: number = 1;

    const isDiagramNameNotEqualToNewName: (diagram: IDiagram) => boolean = (diagram: IDiagram) => {
      return diagram.name !== newName;
    };

    while (newNameFound === false) {
      newName = `${this.diagramInContextMenu.name} (${diagramNumber})`;

      newNameFound = this.openedDiagrams.every(isDiagramNameNotEqualToNewName);

      diagramNumber++;
    }

    const duplicatedDiagram: IDiagram = await this.diagramCreationService.createNewDiagram(
      this.displayedSolutionEntry.uri,
      newName,
      this.diagramInContextMenu.xml,
    );

    await this.solutionService.saveDiagram(duplicatedDiagram, duplicatedDiagram.uri);
    await this.updateSolution();
  }

  /*
   * Called by the parent component to start the creation dialog of a new
   * diagram.
   */
  public async startCreationOfNewDiagram(): Promise<void> {
    if (this.diagramCreationState.isCreateDiagramInputShown) {
      return;
    }

    // Dont allow new diagram creation, if already renaming another diagram.
    if (this.isCurrentlyRenamingDiagram) {
      return;
    }

    if (this.displayedSolutionEntry.isOpenDiagramService) {
      this.openNewDiagram();

      return;
    }

    this.diagramCreationState.isCreateDiagramInputShown = true;

    // The templating update must happen before we can set the focus.
    window.setTimeout(() => {
      this.createNewDiagramInput.focus();
      this.setValidationRules();
    }, 0);

    document.addEventListener('click', this.onCreateNewDiagramClickEvent);
    document.addEventListener('keyup', this.onCreateNewDiagramKeyupEvent);
  }

  @computedFrom('validationController.errors.length')
  public get diagramValidationErrors(): Array<ValidateResult> {
    const validationErrorPresent: boolean = this.validationController.errors.length >= 1;
    if (validationErrorPresent) {
      this.setInvalidCharacterMessage(this.validationController.errors);
    }

    return this.validationController.errors;
  }

  @computedFrom('validationController.errors.length')
  public get hasValidationErrors(): boolean {
    return this.validationController.errors && this.validationController.errors.length > 0;
  }

  @computedFrom('currentlyRenamingDiagram')
  public get currentlyRenamingDiagramUri(): string {
    return this.currentlyRenamingDiagram === null ? null : this.currentlyRenamingDiagram.uri;
  }

  public shouldFileIconBeShown(): boolean {
    return false;
  }

  public canRenameDiagram(): boolean {
    return (
      !this.displayedSolutionEntry.isOpenDiagramService &&
      this.openedSolution &&
      !this.isUriFromRemoteSolution(this.openedSolution.uri)
    );
  }

  public get diagramChangedStateMap(): Map<string, boolean> {
    const isChangedMap: Map<string, boolean> = new Map<string, boolean>();

    this.openedDiagrams.forEach((diagram: IDiagram): void => {
      const diagramState: IDiagramState = this.openDiagramStateService.loadDiagramState(diagram.uri);

      const isChanged: boolean = diagramState !== null && diagramState.metaData.isChanged;

      isChangedMap.set(diagram.uri, isChanged);
    });

    return isChangedMap;
  }

  public canDeleteDiagram(): boolean {
    return !this.displayedSolutionEntry.isOpenDiagramService && this.openedSolution !== undefined;
  }

  public get solutionIsNotLoaded(): boolean {
    return this.openedSolution === null || this.openedSolution === undefined || !this.processEngineRunning;
  }

  public get openedDiagrams(): Array<IDiagram> {
    return this.sortedDiagramsOfSolutions;
  }

  public getDiagramLocation(diagramUri: string): string {
    const lastIndexOfSlash: number = diagramUri.lastIndexOf('/');
    const lastIndexOfBackSlash: number = diagramUri.lastIndexOf('\\');
    const indexBeforeFilename: number = Math.max(lastIndexOfSlash, lastIndexOfBackSlash);

    const diagramLocationWithoutFileName: string = diagramUri.slice(0, indexBeforeFilename);

    return diagramLocationWithoutFileName;
  }

  public getDiagramFolder(diagramUri: string): string {
    const diagramLocation: string = this.getDiagramLocation(diagramUri);

    const lastIndexOfSlash: number = diagramLocation.lastIndexOf('/');
    const lastIndexOfBackSlash: number = diagramLocation.lastIndexOf('\\');
    const indexBeforeFoldername: number = Math.max(lastIndexOfSlash, lastIndexOfBackSlash);

    const indexIsInvalid: boolean = indexBeforeFoldername < 0;
    if (indexIsInvalid) {
      return '';
    }

    const diagramFolder: string = diagramLocation.slice(indexBeforeFoldername, diagramLocation.length);

    return diagramFolder;
  }

  @computedFrom('activeDiagram.uri')
  public get activeDiagramUri(): string {
    const activeDiagramIsNotSet: boolean = this.activeDiagram === undefined;
    if (activeDiagramIsNotSet) {
      return undefined;
    }

    const solutionUri: string = this.router.currentInstruction.queryParams.solutionUri;

    const solutionUriUnspecified: boolean = solutionUri === undefined;
    if (solutionUriUnspecified) {
      return undefined;
    }

    /**
     * We have to check if THIS solution is the "Open Diagrams"-Solution
     * because it is our special case here and if the ACTIVE solution is the
     * "Open Diagrams"-Solution we need to return the uri anyway.
     */
    const openDiagramSolutionIsActive: boolean = solutionUri === 'about:open-diagrams';
    if (this.displayedSolutionEntry.isOpenDiagramService && openDiagramSolutionIsActive) {
      return this.activeDiagram.uri;
    }

    return this.activeDiagram.uri;
  }

  public async openDiagram(diagram: IDiagram): Promise<void> {
    const diagramIsFromLocalSolution: boolean = !this.isUriFromRemoteSolution(diagram.uri);

    if (diagramIsFromLocalSolution) {
      const diagramIsNotYetOpened: boolean = !this.openDiagramService
        .getOpenedDiagrams()
        .some((openedDiagram: IDiagram): boolean => {
          return openedDiagram.uri === diagram.uri;
        });

      if (diagramIsNotYetOpened) {
        await this.openDiagramService.openDiagramFromSolution(diagram.uri, this.createIdentityForSolutionExplorer());
      }
    }

    this.navigateToDetailView(diagram);
  }

  private closeDiagramEventFunction: Function = (): void => {
    const noDiagramIsActive: boolean = this.activeDiagram === undefined;
    if (noDiagramIsActive) {
      return;
    }

    const solutionIsRemoteSolution: boolean = this.displayedSolutionEntry.uri.startsWith('http');
    if (solutionIsRemoteSolution) {
      this.router.navigateToRoute('start-page');
    } else {
      this.closeDiagram(this.activeDiagram);
    }
  };

  private closeAllDiagramsEventFunction: Function = async (): Promise<void> => {
    const currentlyOpenDiagrams: Array<IDiagram> = [...this.openedDiagrams];

    await this.closeMultipleDiagrams(currentlyOpenDiagrams);
  };

  private async closeMultipleDiagrams(diagrams: Array<IDiagram>): Promise<void> {
    const diagramsIsEmpty: boolean = diagrams === undefined || diagrams.length === 0;
    if (diagramsIsEmpty) {
      return;
    }

    const amountOfDiagrams: number = diagrams.length;

    this.navigateToDiagram(diagrams[0]);

    for (let index: number = 0; index < amountOfDiagrams; index++) {
      const nextDiagramIndex: number = index + 1;
      const isLastDiagram: boolean = nextDiagramIndex === amountOfDiagrams;

      const currentDiagram: IDiagram = diagrams[index];
      const nextDiagram: IDiagram = isLastDiagram ? undefined : diagrams[nextDiagramIndex];

      const diagramState: IDiagramState = this.openDiagramStateService.loadDiagramState(currentDiagram.uri);
      const diagramHasUnsavedChanges: boolean = diagramState !== null && diagramState.metaData.isChanged;

      let saveDiagram: boolean = false;
      let closeDiagram: boolean = true;

      if (diagramHasUnsavedChanges) {
        const closeModalResult: CloseModalResult = await this.showCloseDiagramModal(currentDiagram, false);

        closeDiagram = closeModalResult !== CloseModalResult.Cancel;
        saveDiagram = closeModalResult === CloseModalResult.Save;
      }

      const diagramIsNewDiagram: boolean = currentDiagram.uri.startsWith('about:open-diagrams');
      if (saveDiagram && diagramIsNewDiagram) {
        await this.waitForNavigation();
      }

      if (isLastDiagram) {
        await this.navigateToStartPage();
      } else {
        await this.navigateToDiagram(nextDiagram);
      }

      if (closeDiagram) {
        await this.closeOpenDiagram(currentDiagram);
      }
    }
  }

  private get isCurrentlyRenamingDiagram(): boolean {
    return this.currentlyRenamingDiagram !== null;
  }

  private waitForNavigation(): Promise<void> {
    return new Promise((resolve: Function): void => {
      this.eventAggregator.subscribeOnce('router:navigation:success', () => {
        resolve();
      });
    });
  }

  private navigateToStartPage(): Promise<void> {
    return new Promise((resolve: Function): void => {
      this.eventAggregator.subscribeOnce('router:navigation:success', () => {
        resolve();
      });

      this.router.navigateToRoute('start-page');
    });
  }

  private async navigateToDiagram(diagram: IDiagram): Promise<void> {
    return new Promise((resolve: Function): void => {
      this.eventAggregator.subscribeOnce('router:navigation:success', () => {
        resolve();
      });

      this.router.navigateToRoute('design', {
        view: this.designView,
        diagramName: diagram.name,
        diagramUri: diagram.uri,
        solutionUri: this.displayedSolutionEntry.uri,
      });
    });
  }

  private async navigateBack(): Promise<void> {
    return new Promise<void>((resolve: Function): void => {
      this.eventAggregator.subscribeOnce('router:navigation:success', () => {
        resolve();
      });

      this.router.navigateBack();
    });
  }

  private saveAllDiagramsEventFunction: Function = (): void => {
    this.saveAllUnsavedDiagrams();
  };

  private startPolling(): void {
    if (this.displayedSolutionEntry.isOpenDiagramService) {
      return;
    }

    this.refreshTimeoutTask = setTimeout(async () => {
      await this.updateSolution();

      if (this.isAttached) {
        this.startPolling();
      }
    }, environment.processengine.solutionExplorerPollingIntervalInMs);
  }

  // TODO: This method is copied all over the place.
  private async navigateToDetailView(diagram: IDiagram): Promise<void> {
    const diagramIsNoRemoteDiagram: boolean = !this.isUriFromRemoteSolution(diagram.uri);
    if (diagramIsNoRemoteDiagram) {
      const viewIsHeatmapOrInspectCorrelation: boolean =
        this.inspectView === 'inspect-correlation' || this.inspectView === 'heatmap';

      if (viewIsHeatmapOrInspectCorrelation) {
        this.inspectView = 'dashboard';
      }

      this.eventAggregator.publish(environment.events.navBar.inspectNavigateToDashboard);

      const activeRouteIsInspect: boolean = this.diagramRoute === 'inspect';
      if (activeRouteIsInspect) {
        this.notificationService.showNotification(
          NotificationType.INFO,
          'There are currently no runtime information about this process available.',
        );
      }
    }

    await this.router.navigateToRoute(this.diagramRoute, {
      view: this.inspectView ? this.inspectView : this.designView,
      diagramName: diagram.name,
      diagramUri: diagram.uri,
      solutionUri: this.displayedSolutionEntry.uri,
    });
  }

  private createIdentityForSolutionExplorer(): IIdentity {
    const accessToken: string = this.createDummyAccessToken();
    // TODO: Get the identity from the IdentityService of `@process-engine/iam`
    const identity: IIdentity = {
      token: accessToken,
      userId: '', // Provided by the IdentityService.
    };

    return identity;
  }

  private createDummyAccessToken(): string {
    const dummyAccessTokenString: string = 'dummy_token';
    const base64EncodedString: string = btoa(dummyAccessTokenString);

    return base64EncodedString;
  }

  private get diagramSorter(): DiagramSorter {
    const sortOptions: Intl.CollatorOptions = {
      caseFirst: 'lower',
    };

    const sorter: DiagramSorter = (firstElement: IDiagram, secondElement: IDiagram): number => {
      return firstElement.name.localeCompare(secondElement.name, undefined, sortOptions);
    };

    return sorter;
  }

  private async saveAllUnsavedDiagrams(): Promise<void> {
    const diagramStateList: IDiagramStateList = this.openDiagramStateService.loadDiagramStateForAllDiagrams();

    for (const diagramStateListEntry of diagramStateList) {
      const isActiveDiagram: boolean =
        this.activeDiagram !== undefined && this.activeDiagram.uri === diagramStateListEntry.uri;
      if (isActiveDiagram) {
        this.eventAggregator.publish(environment.events.diagramDetail.saveDiagram);

        continue;
      }

      const diagramToSave: IDiagram = this.openedDiagrams.find((diagram: IDiagram) => {
        return diagram.uri === diagramStateListEntry.uri;
      });

      diagramToSave.xml = diagramStateListEntry.diagramState.data.xml;

      await this.openDiagramService.saveDiagram(diagramToSave);
      const diagramState: IDiagramState = diagramStateListEntry.diagramState;

      diagramState.metaData.isChanged = false;

      this.openDiagramStateService.updateDiagramState(diagramStateListEntry.uri, diagramState);
    }
  }

  private refreshDisplayedDiagrams(): void {
    this.sortedDiagramsOfSolutions = this.displayedSolutionEntry.isOpenDiagramService
      ? this.openedSolution.diagrams
      : this.openedSolution.diagrams.sort(this.diagramSorter);
  }

  private async closeOpenDiagram(diagramToClose: IDiagram): Promise<void> {
    const openDiagramService: OpenDiagramsSolutionExplorerService = this
      .solutionService as OpenDiagramsSolutionExplorerService;

    await openDiagramService.closeDiagram(diagramToClose);

    this.globalSolutionService.removeOpenDiagramByUri(diagramToClose.uri);
  }

  private async showCloseDiagramModal(
    diagramToSave: IDiagram,
    shouldNavigate: boolean = true,
  ): Promise<CloseModalResult> {
    const previousLocation: string = (this.router.history as any).previousLocation;

    const diagramToSaveIsNotActiveDiagram: boolean = diagramToSave.uri !== this.activeDiagramUri;
    if (diagramToSaveIsNotActiveDiagram && shouldNavigate) {
      await this.navigateToDiagram(diagramToSave);
    }

    const modalResult: Promise<CloseModalResult> = new Promise(
      (resolve: Function, reject: Function): CloseModalResult | void => {
        const dontSaveFunction: EventListenerOrEventListenerObject = async (): Promise<void> => {
          this.showCloseModal = false;

          document.getElementById('dontSaveButtonCloseView').removeEventListener('click', dontSaveFunction);
          document.getElementById('saveButtonCloseView').removeEventListener('click', saveFunction);
          document.getElementById('cancelButtonCloseView').removeEventListener('click', cancelFunction);

          if (diagramToSaveIsNotActiveDiagram && shouldNavigate) {
            await this.navigateBack();
          }

          resolve(CloseModalResult.Delete);
        };

        const saveFunction: EventListenerOrEventListenerObject = async (): Promise<void> => {
          this.eventAggregator.subscribeOnce(environment.events.navBar.diagramChangesResolved, async () => {
            if (shouldNavigate) {
              await this.waitForNavigation();

              this.router.navigate(previousLocation);
            }

            resolve(CloseModalResult.Save);
          });

          this.eventAggregator.publish(environment.events.diagramDetail.saveDiagram);

          this.showCloseModal = false;

          document.getElementById('dontSaveButtonCloseView').removeEventListener('click', dontSaveFunction);
          document.getElementById('saveButtonCloseView').removeEventListener('click', saveFunction);
          document.getElementById('cancelButtonCloseView').removeEventListener('click', cancelFunction);
        };

        const cancelFunction: EventListenerOrEventListenerObject = async (): Promise<void> => {
          this.showCloseModal = false;

          document.getElementById('dontSaveButtonCloseView').removeEventListener('click', dontSaveFunction);
          document.getElementById('saveButtonCloseView').removeEventListener('click', saveFunction);
          document.getElementById('cancelButtonCloseView').removeEventListener('click', cancelFunction);

          if (diagramToSaveIsNotActiveDiagram && shouldNavigate) {
            await this.navigateBack();
          }

          resolve(CloseModalResult.Cancel);
        };

        // register onClick handler
        document.getElementById('dontSaveButtonCloseView').addEventListener('click', dontSaveFunction);
        document.getElementById('saveButtonCloseView').addEventListener('click', saveFunction);
        document.getElementById('cancelButtonCloseView').addEventListener('click', cancelFunction);

        this.showCloseModal = true;
      },
    );

    return modalResult;
  }

  private async isDiagramDetailViewOfDiagramOpen(diagramUriToCheck: string): Promise<boolean> {
    const activeDiagramIsUndefined: boolean = this.activeDiagram === undefined;
    if (activeDiagramIsUndefined) {
      return false;
    }

    const diagramIsOpened: boolean = diagramUriToCheck === this.activeDiagramUri;

    return diagramIsOpened;
  }

  /**
   * Looks in the given Array of validation errors for an invalid character
   * error message and replace the messages content with the acutal
   * message and returns a reference to a new array with the mod
   *
   * TODO: This method should create a deep copy of an arra< that contains
   * errors and return it instead of just modifying the reference.
   *
   */
  private setInvalidCharacterMessage(errors: Array<ValidateResult>): void {
    const invalidCharacterString: string = 'Your diagram contains at least one invalid-character: ';

    for (const currentError of this.validationController.errors) {
      const validationErrorIsInvalidCharacter: boolean = currentError.message.startsWith(invalidCharacterString);

      if (validationErrorIsInvalidCharacter) {
        const inputToValidate: string = currentError.message.replace(invalidCharacterString, '');

        const invalidCharacters: Array<string> = this.getInvalidCharacters(inputToValidate);

        currentError.message = this.getInvalidCharacterErrorMessage(invalidCharacters);
      }
    }
  }

  /**
   *  Searches in the given input string for all invalid characters and returns
   *  them as a char array.
   *
   * @param input input that contains invalid characters.
   * @param returns An array that contains all invalid characters.
   */
  private getInvalidCharacters(input: string): Array<string> {
    const inputLetters: Array<string> = input.split('');
    const invalidCharacters: Array<string> = inputLetters.filter((letter: string) => {
      const rules: Array<RegExp> = Object.values(this.diagramValidationRegExpList);
      const letterIsInvalid: boolean = !rules.some((regExp: RegExp) => {
        return letter.match(regExp) !== null;
      });

      return letterIsInvalid;
    });

    return invalidCharacters;
  }

  /**
   * Build an error message which lists all invalid characters.
   *
   * @param invalidCharacters An array that contains all detected invalid
   * characters.
   * @return A string with an error message that contains all invalid characters
   * of a diagram name.
   */
  private getInvalidCharacterErrorMessage(invalidCharacters: Array<string>): string {
    // This filters all duplicate invalid characters so that the list contains each character only once.
    const filteredInvalidCharacters: Array<string> = invalidCharacters.filter(
      (current: string, index: number): boolean => {
        return invalidCharacters.indexOf(current) === index;
      },
    );

    const messagePrefix: string = 'Your diagram contains at least one invalid-character: ';

    // Replaces the commas between the invalid characters by a space to increase readability.
    const invalidCharacterString: string = `${filteredInvalidCharacters}`.replace(/(.)./g, '$1 ');

    return `${messagePrefix} ${invalidCharacterString}`;
  }

  private async openNewDiagram(): Promise<void> {
    const unsavedDiagrams: Array<IDiagram> = this.openedDiagrams.filter((diagram: IDiagram): boolean => {
      const diagramIsUnsavedDiagram: boolean = diagram.name.startsWith('Untitled');

      return diagramIsUnsavedDiagram;
    });

    const unsavedDiagramIndexes: Array<number> = unsavedDiagrams.map((diagram: IDiagram) => {
      const diagramIndex: number = parseInt(diagram.name.replace('Untitled-', ''));

      return diagramIndex;
    });

    const anotherUnsavedDiagramExists: boolean = unsavedDiagrams.length > 0;
    const newDiagramIndex: number = anotherUnsavedDiagramExists ? Math.max(...unsavedDiagramIndexes) + 1 : 1;

    const solutionIsNotFullyOpen: boolean = this.openedSolution === undefined;
    if (solutionIsNotFullyOpen) {
      await this.updateSolution();
    }

    const createdDiagram: IDiagram = await this.diagramCreationService.createNewDiagram(
      this.openedSolution.uri,
      `Untitled-${newDiagramIndex}`,
    );

    this.openDiagramStateService.saveDiagramState(createdDiagram.uri, createdDiagram.xml, undefined, undefined, true);

    this.openDiagramService.openDiagramFromSolution(createdDiagram.uri, this.createIdentityForSolutionExplorer());

    await this.updateSolution();

    this.navigateToDetailView(createdDiagram);
  }

  /**
   * The event listener used to handle mouse clicks during the diagram
   * creation.
   *
   * The listener will try to finish the diagram creation if the user clicks
   * on another element then the input.
   */
  private onCreateNewDiagramClickEvent = async (event: MouseEvent): Promise<void> => {
    const inputWasClicked: boolean = event.target === this.createNewDiagramInput;
    if (inputWasClicked) {
      return;
    }

    const emptyDiagram: IDiagram = await this.finishDiagramCreation();
    if (emptyDiagram === undefined) {
      return;
    }

    await this.openDiagramAndUpdateSolution(emptyDiagram);
  };

  private async openDiagramAndUpdateSolution(createdDiagram: IDiagram): Promise<void> {
    await this.openDiagramService.openDiagramFromSolution(createdDiagram.uri, this.createIdentityForSolutionExplorer());

    await this.updateSolution();
    this.resetDiagramCreation();
    this.navigateToDetailView(createdDiagram);
  }

  /**
   * The event listener used to handle keyboard events during the diagram
   * creation.
   *
   * The listener will try to finish the diagram creation if the user presses
   * the enter key. It will abort the creation if the escape key is pressed.
   */
  private onCreateNewDiagramKeyupEvent = async (event: KeyboardEvent): Promise<void> => {
    const pressedKey: string = event.key;

    if (pressedKey === ENTER_KEY) {
      const emptyDiagram: IDiagram = await this.finishDiagramCreation();
      if (emptyDiagram === undefined) {
        return;
      }

      await this.openDiagramAndUpdateSolution(emptyDiagram);
    } else if (pressedKey === ESCAPE_KEY) {
      this.resetDiagramCreation();
    }
  };

  /**
   * The event listener used to handle mouse clicks during the diagram
   * renaming.
   *
   * The listener will try to finish the diagram renaming if the user clicks
   * on another element then the input. It will abort if there are any
   * validation errors.
   */
  private onRenameDiagramClickEvent = async (event: MouseEvent): Promise<void> => {
    const inputWasClicked: boolean = event.target === this.renameDiagramInput;
    if (inputWasClicked) {
      return;
    }

    const inputWasNotValid: boolean = !(await this.finishDiagramRenaming(true));
    if (inputWasNotValid) {
      this.resetDiagramRenaming();

      return;
    }

    this.updateSolution().then(() => {
      this.refreshDisplayedDiagrams();
    });

    this.resetDiagramRenaming();
  };

  /**
   * The event listener used to handle keyboard events during the diagram
   * renaming.
   *
   * The listener will try to finish the diagram creation if the user presses
   * the enter key. It will abort the creation if the escape key is pressed. It
   * will not abort the diagram renaming, if there are validation errors.
   */
  private onRenameDiagramKeyupEvent = async (event: KeyboardEvent): Promise<void> => {
    const pressedKey: string = event.key;

    const enterWasPressed: boolean = pressedKey === ENTER_KEY;
    const escapeWasPressed: boolean = pressedKey === ESCAPE_KEY;

    if (enterWasPressed) {
      const inputWasNotValid: boolean = !(await this.finishDiagramRenaming(false));
      if (inputWasNotValid) {
        return;
      }

      this.updateSolution().then(() => {
        this.refreshDisplayedDiagrams();
      });
      this.resetDiagramRenaming();
    } else if (escapeWasPressed) {
      this.resetDiagramRenaming();
    }
  };

  /**
   * Checks, if the input contains any non empty values.
   *
   * @return true, if the input has some non empty value.
   */
  private hasNonEmptyValue(input: HTMLInputElement): boolean {
    const inputValue: string = input.value;

    const inputHasValue: boolean = inputValue !== undefined && inputValue !== null && inputValue !== '';

    return inputHasValue;
  }

  /**
   * Finishes the diagram renaming process. This method will again run the
   * validation and ensures that all input is correct. Otherwise an error is
   * displayed to the user.
   *
   * If the validation passes, the diagram will be created and returned.
   *
   * @param silent if a notification should be shown on validation failure.
   * @returns true if the diagram was renamed, false otherwise.
   */
  private async finishDiagramRenaming(silent: boolean): Promise<boolean> {
    const validationResult: ControllerValidateResult = await this.validationController.validate();
    const inputWasNotValid: boolean =
      !validationResult.valid || (this.validationController.errors && this.validationController.errors.length > 0);

    if (inputWasNotValid) {
      if (!silent) {
        const message: string = 'Please resolve all errors first.';

        this.notificationService.showNotification(NotificationType.INFO, message);
      }

      return false;
    }

    const filenameWasNotChanged: boolean =
      this.currentlyRenamingDiagram.name === this.diagramRenamingState.currentDiagramInputValue;
    if (filenameWasNotChanged) {
      return true;
    }

    try {
      await this.solutionService.renameDiagram(
        this.currentlyRenamingDiagram,
        this.diagramRenamingState.currentDiagramInputValue,
      );
      this.eventAggregator.publish(environment.events.diagramChangedByStudio, 'rename');
    } catch (error) {
      this.notificationService.showNotification(NotificationType.WARNING, error.message);

      return false;
    }

    return true;
  }

  /**
   * Finishes the diagram creation. This method will again run the validation
   * and ensures that all input is correct. Otherwise an error is displayed to
   * the user.
   *
   * If no input element was empty, the diagram creation will be aborted.
   * If the validation passes, the diagram will be created and returned.
   */
  private async finishDiagramCreation(): Promise<IDiagram> {
    const inputHasNoValue: boolean = !this.hasNonEmptyValue(this.createNewDiagramInput);
    if (inputHasNoValue) {
      this.resetDiagramCreation();

      return undefined;
    }

    const validationResult: ControllerValidateResult = await this.validationController.validate();

    const inputWasNotValid: boolean =
      !validationResult.valid || (this.validationController.errors && this.validationController.errors.length > 0);

    if (inputWasNotValid) {
      const message: string = 'Please resolve all errors first.';
      this.notificationService.showNotification(NotificationType.INFO, message);

      return undefined;
    }

    const emptyDiagram: IDiagram = await this.diagramCreationService.createNewDiagram(
      this.openedSolution.uri,
      this.diagramCreationState.currentDiagramInputValue,
    );

    try {
      await this.solutionService.saveDiagram(emptyDiagram, emptyDiagram.uri);
    } catch (error) {
      this.notificationService.showNotification(NotificationType.ERROR, error.message);

      return undefined;
    }

    return emptyDiagram;
  }

  /**
   * Resets the diagram renaming state to its default. Any listeners will be
   * removed and input values will be cleared.
   */
  private resetDiagramRenaming(): void {
    // Remove all used event listeners.
    document.removeEventListener('click', this.onRenameDiagramClickEvent);
    document.removeEventListener('keyup', this.onRenameDiagramKeyupEvent);

    // Reset input field.
    this.diagramRenamingState.currentDiagramInputValue = '';
    this.renameDiagramInput.value = '';
    // Hide input field.
    this.currentlyRenamingDiagram = null;

    ValidationRules.off(this.diagramRenamingState);
  }

  /**
   * Resets the diagram creation state to its default. Any listeners will be
   * removed and input values will be cleared.
   */
  private resetDiagramCreation(): void {
    // Remove all used event listeners.
    document.removeEventListener('click', this.onCreateNewDiagramClickEvent);
    document.removeEventListener('keyup', this.onCreateNewDiagramKeyupEvent);

    // Reset input field.
    this.diagramCreationState.currentDiagramInputValue = '';
    this.createNewDiagramInput.value = '';
    // Hide input field.
    this.diagramCreationState.isCreateDiagramInputShown = false;

    ValidationRules.off(this.diagramCreationState);
  }

  private findURIObject<TType extends {uri: string}>(objects: Array<TType>, targetURI: string): TType {
    const foundObject: TType = objects.find((object: TType): boolean => {
      return object.uri.toLowerCase() === targetURI.toLowerCase();
    });

    return foundObject;
  }

  private disposeSubscriptions(): void {
    for (const subscription of this.subscriptions) {
      subscription.dispose();
    }
  }

  private async updateSolutionExplorer(): Promise<void> {
    const solutionUri: string = this.router.currentInstruction.queryParams.solutionUri;
    const solutionUriSpecified: boolean = solutionUri !== undefined;

    const diagramName: string = this.router.currentInstruction.params.diagramName;
    const diagramNameIsSpecified: boolean = diagramName !== undefined;

    const diagramUri: string = this.router.currentInstruction.queryParams.diagramUri;

    const routeName: string = this.router.currentInstruction.config.name;
    const routeNameNeedsUpdate: boolean = routeName === 'design' || routeName === 'inspect' || routeName === 'think';
    if (routeNameNeedsUpdate) {
      this.diagramRoute = routeName;
      this.inspectView = this.router.currentInstruction.params.view;
    }

    this.activeDiagram = undefined;

    if (solutionUriSpecified && diagramNameIsSpecified) {
      try {
        const activeSolution: ISolution = await this.solutionService.loadSolution();
        this.activeDiagram = activeSolution.diagrams.find((diagram: IDiagram) => {
          return diagram.name === diagramName && (diagram.uri === diagramUri || diagramUri === undefined);
        });
      } catch {
        // Do nothing
      }
    }
  }

  private setValidationRules(): void {
    ValidationRules.ensure((state: IDiagramNameInputState) => state.currentDiagramInputValue)
      .required()
      .withMessage('Diagram name cannot be blank.')
      .satisfies((input: string) => {
        const inputIsNotEmpty: boolean = input !== undefined;

        const inputAsCharArray: Array<string> = inputIsNotEmpty ? input.split('') : [];

        const diagramNamePassesNameChecks: boolean = inputAsCharArray.every((letter: string) => {
          // tslint:disable-next-line:typedef
          const letterMatches = (regExp: RegExp): boolean => regExp.test(letter);

          return this.diagramValidationRegExpList.some(letterMatches);
        });

        return diagramNamePassesNameChecks;
      })
      // eslint-disable-next-line quotes
      .withMessage(`Your diagram contains at least one invalid-character: \${$value}`)
      .satisfies((input: string) => {
        const inputIsNotEmpty: boolean = input !== undefined;

        const diagramDoesNotStartWithWhitespace: boolean = inputIsNotEmpty ? !/^\s/.test(input) : true;

        return diagramDoesNotStartWithWhitespace;
      })
      .withMessage('The diagram name cannot start with a whitespace character.')
      .satisfies((input: string) => {
        const inputIsNotEmpty: boolean = input !== undefined;

        const diagramDoesNotEndWithWhitespace: boolean = inputIsNotEmpty ? !/\s+$/.test(input) : true;

        return diagramDoesNotEndWithWhitespace;
      })
      .withMessage('The diagram name cannot end with a whitespace character.')
      .then()
      .satisfies(async (input: string) => {
        const diagramNameIsUnchanged: boolean =
          this.isCurrentlyRenamingDiagram && this.currentlyRenamingDiagram.name.toLowerCase() === input.toLowerCase();

        if (diagramNameIsUnchanged) {
          return true;
        }

        // The solution may have changed on the file system.
        await this.updateSolution();

        const isRemoteSolution: boolean = this.isUriFromRemoteSolution(this.openedSolution.uri);
        const isRunningInElectron: boolean = (window as any).nodeRequire;

        let expectedDiagramUri: string;
        if (isRemoteSolution) {
          expectedDiagramUri = `${this.openedSolution.uri}/${input}.bpmn`;
        } else if (isRunningInElectron) {
          expectedDiagramUri = join(this.openedSolution.uri, `${input}.bpmn`);
        }

        const diagramWithUriDoesNotExist: boolean =
          this.findURIObject(this.openedSolution.diagrams, expectedDiagramUri) === undefined;
        return diagramWithUriDoesNotExist;
      })
      .withMessage('A diagram with that name already exists.')
      .on(this.diagramRenamingState)
      .on(this.diagramCreationState);
  }

  private isUriFromRemoteSolution(uri: string): boolean {
    return uri.startsWith('http');
  }
}
