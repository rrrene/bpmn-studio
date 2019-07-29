import {EventAggregator, Subscription} from 'aurelia-event-aggregator';
import {bindable, inject, observable} from 'aurelia-framework';
import {Router} from 'aurelia-router';

import {IDiagram} from '@process-engine/solutionexplorer.contracts';

import {AuthenticationStateEvent, IFile, IInputEvent, ISolutionEntry, ISolutionService} from '../../../contracts/index';
import {NotificationType} from '../../../contracts/index';
import environment from '../../../environment';
import {NotificationService} from '../../../services/notification-service/notification.service';
import {SolutionExplorerList} from '../solution-explorer-list/solution-explorer-list';

type RemoteSolutionUriWithStatus = {uri: string; status: boolean};

/**
 * This component handels:
 *  - Opening files via drag and drop
 *  - Opening files via double click
 *  - Opening solution/diagrams via input field
 *  - Refreshing all opened solutions via button
 *  - Refreshing on login/logout
 *  - Updating the remote processengine uri if needed
 */
@inject(EventAggregator, 'NotificationService', Router, 'SolutionService')
export class SolutionExplorerPanel {
  @observable public selectedProtocol: string = 'http://';

  private _eventAggregator: EventAggregator;
  private _notificationService: NotificationService;
  private _router: Router;
  // TODO: Add typings
  private _ipcRenderer: any | null = null;
  private _subscriptions: Array<Subscription> = [];
  private _solutionService: ISolutionService;
  private _remoteSolutionHistoryStatusPollingTimer: NodeJS.Timer;
  private _remoteSolutionHistoryStatusIsPolling: boolean;

  // Fields below are bound from the html view.
  public solutionExplorerList: SolutionExplorerList;
  public solutionInput: HTMLInputElement;
  public openDiagramInput: HTMLInputElement;
  public showOpenRemoteSolutionModal: boolean = false;
  @bindable public uriOfRemoteSolutionWithoutProtocol: string;
  public solutionExplorerPanel: SolutionExplorerPanel = this;
  public remoteSolutionHistoryStatus: Map<string, boolean> = new Map<string, boolean>();

  constructor(
    eventAggregator: EventAggregator,
    notificationService: NotificationService,
    router: Router,
    solutionService: ISolutionService,
  ) {
    this._eventAggregator = eventAggregator;
    this._notificationService = notificationService;
    this._router = router;
    this._solutionService = solutionService;

    if (this.canReadFromFileSystem()) {
      this._ipcRenderer = (window as any).nodeRequire('electron').ipcRenderer;
    }
  }

  public async bind(): Promise<void> {
    // Open the solution of the currently configured processengine instance on startup.
    const uriOfProcessEngine: string = window.localStorage.getItem('InternalProcessEngineRoute');

    const persistedInternalSolution: ISolutionEntry = this._solutionService.getSolutionEntryForUri(uriOfProcessEngine);
    const internalSolutionWasPersisted: boolean = persistedInternalSolution !== undefined;

    try {
      if (internalSolutionWasPersisted) {
        this.solutionExplorerList.openSolution(uriOfProcessEngine, false, persistedInternalSolution.identity);
      } else {
        this.solutionExplorerList.openSolution(uriOfProcessEngine);
      }
    } catch {
      return;
    }

    // Open the previously opened solutions.
    const previouslyOpenedSolutions: Array<ISolutionEntry> = this._solutionService.getPersistedEntries();
    previouslyOpenedSolutions.forEach((entry: ISolutionEntry) => {
      // We are not adding the solution of the connect PE here again since that happened above.
      const entryIsNotConnectedProcessEngine: boolean = entry.uri !== uriOfProcessEngine;
      if (entryIsNotConnectedProcessEngine) {
        /**
         * Since we can't distinguish if the persisted ProcessEngine was an
         * internal or external one yet, we consume any connection error
         * produced by the openSolution method.
         */
        try {
          this.solutionExplorerList.openSolution(entry.uri, false, entry.identity);
        } catch (error) {
          return;
        }
      }
    });

    const persistedOpenDiagrams: Array<IDiagram> = this._solutionService.getOpenDiagrams();
    persistedOpenDiagrams.forEach((diagram: IDiagram) => {
      try {
        this.solutionExplorerList.openDiagram(diagram.uri);
      } catch {
        return;
      }
    });
  }

  public async attached(): Promise<void> {
    if (this.canReadFromFileSystem()) {
      this._registerElectronHooks();
      document.addEventListener('drop', this._openDiagramOnDropBehaviour);
    }

    this._subscriptions = [
      this._eventAggregator.subscribe(environment.events.diagramDetail.onDiagramDeployed, () => {
        this._refreshSolutions();
      }),
      this._eventAggregator.subscribe(environment.events.startPage.openLocalSolution, () => {
        this.openSolution();
      }),
      this._eventAggregator.subscribe(environment.events.startPage.openDiagram, () => {
        this.openDiagram();
      }),
      this._eventAggregator.subscribe(environment.events.startPage.createDiagram, () => {
        this._createNewDiagram();
      }),
      this._eventAggregator.subscribe(AuthenticationStateEvent.LOGOUT, () => {
        this.solutionExplorerList.refreshSolutions();
      }),
    ];
  }

  public detached(): void {
    if (this.canReadFromFileSystem()) {
      this._removeElectronFileOpeningHooks();
      document.removeEventListener('drop', this._openDiagramOnDropBehaviour);
    }

    for (const subscription of this._subscriptions) {
      subscription.dispose();
    }
  }

  public async openRemoteSolutionModal(): Promise<void> {
    this.showOpenRemoteSolutionModal = true;

    await this._updateRemoteSolutionHistoryStatus();
    this._startPollingOfRemoteSolutionHistoryStatus();
  }

  public removeSolutionFromHistory(solutionUri: string): void {
    this._removeSolutionFromSolutionHistroy(solutionUri);
  }

  public selectProtocol(protocol: string): void {
    this.selectedProtocol = protocol;
  }

  public closeRemoteSolutionModal(): void {
    this.showOpenRemoteSolutionModal = false;
    this.uriOfRemoteSolutionWithoutProtocol = undefined;
    this._stopPollingOfRemoteSolutionHistoryStatus();
  }

  public async openRemoteSolution(): Promise<void> {
    if (!this.uriIsValid || this.uriIsEmpty) {
      return;
    }

    this.showOpenRemoteSolutionModal = false;

    try {
      const lastCharacterIsASlash: boolean = this.uriOfRemoteSolutionWithoutProtocol.endsWith('/');
      if (lastCharacterIsASlash) {
        this.uriOfRemoteSolutionWithoutProtocol = this.uriOfRemoteSolutionWithoutProtocol.slice(0, -1);
      }

      await this._addSolutionToRemoteSolutionHistory(this.uriOfRemoteSolution);

      await this.solutionExplorerList.openSolution(this.uriOfRemoteSolution);
    } catch (error) {
      const genericMessage: string = `Unable to connect to ProcessEngine on: ${this.uriOfRemoteSolution}`;
      const cause: string = error.message ? error.message : '';
      this._notificationService.showNotification(NotificationType.ERROR, `${genericMessage}<br />${cause}`);
    }

    this.closeRemoteSolutionModal();
  }

  public get remoteSolutionHistoryExists(): boolean {
    return this.remoteSolutionHistoryWithStatus.length > 0;
  }

  public get remoteSolutionHistoryWithStatus(): Array<RemoteSolutionUriWithStatus> {
    return this._loadRemoteSolutionHistory()
      .reverse()
      .map((solutionUri: string) => {
        return {
          uri: solutionUri,
          status: this.remoteSolutionHistoryStatus.get(solutionUri),
        };
      });
  }

  /**
   * Handles the file input for the FileSystem Solutions.
   * @param event A event that holds the files that were "uploaded" by the user.
   * Currently there is no type for this kind of event.
   */
  public async onSolutionInputChange(event: IInputEvent): Promise<void> {
    const uri: string = event.target.files[0].path;
    this.solutionInput.value = '';

    this._openSolutionOrDisplayError(uri);
  }

  /**
   * Handles the file input change event for the open file input.
   * @param event An event that holds the files that were "uploaded" by the user.
   * Currently there is no type for this kind of event.
   */
  public async onOpenDiagramInputChange(event: IInputEvent): Promise<void> {
    const uri: string = event.target.files[0].path;
    this.openDiagramInput.value = '';

    return this._openDiagramOrDisplayError(uri);
  }

  public async openDiagram(): Promise<void> {
    const canNotReadFromFileSystem: boolean = !this.canReadFromFileSystem();
    if (canNotReadFromFileSystem) {
      this.openDiagramInput.click();

      return;
    }

    this._ipcRenderer.send('open_diagram');

    this._ipcRenderer.once('import_opened_diagram', async (event: Event, openedFile: File) => {
      const noFileSelected: boolean = openedFile === null;
      if (noFileSelected) {
        return;
      }

      const filePath: string = openedFile[0];

      await this._openDiagramOrDisplayError(filePath);
    });
  }

  public get uriOfRemoteSolution(): string {
    return `${this.selectedProtocol}${this.uriOfRemoteSolutionWithoutProtocol}`;
  }

  public get uriIsValid(): boolean {
    /**
     * This RegEx checks if the entered URI is valid or not.
     */
    const urlRegEx: RegExp = /^(?:http(s)?:\/\/)+[\w.-]?[\w\-\._~:/?#[\]@!\$&\'\(\)\*\+,;=.]+$/g;
    const uriIsValid: boolean = urlRegEx.test(this.uriOfRemoteSolution);

    return uriIsValid;
  }

  public get uriIsEmpty(): boolean {
    const uriIsEmtpy: boolean =
      this.uriOfRemoteSolutionWithoutProtocol === undefined || this.uriOfRemoteSolutionWithoutProtocol.length === 0;

    return uriIsEmtpy;
  }

  public async openSolution(): Promise<void> {
    const canNotReadFromFileSystem: boolean = !this.canReadFromFileSystem();
    if (canNotReadFromFileSystem) {
      this.solutionInput.click();

      return;
    }

    this._ipcRenderer.send('open_solution');

    this._ipcRenderer.once('import_opened_solution', async (event: Event, openedFolder: File) => {
      const noFolderSelected: boolean = openedFolder === null;
      if (noFolderSelected) {
        return;
      }

      const folderPath: string = openedFolder[0];
      await this._openSolutionOrDisplayError(folderPath);
    });
  }

  public canReadFromFileSystem(): boolean {
    return (window as any).nodeRequire;
  }

  public selectRemoteSolution(remoteSolutionUri: string): void {
    // tslint:disable-next-line no-magic-numbers
    const protocolEndIndex: number = remoteSolutionUri.indexOf('//') + 2;
    const protocol: string = remoteSolutionUri.substring(0, protocolEndIndex);

    const uri: string = remoteSolutionUri.substring(protocolEndIndex, remoteSolutionUri.length);

    this.selectProtocol(protocol);
    this.uriOfRemoteSolutionWithoutProtocol = uri;
  }

  private _startPollingOfRemoteSolutionHistoryStatus(): void {
    this._remoteSolutionHistoryStatusIsPolling = true;
    this._pollRemoteSolutionHistoryStauts();
  }

  private _pollRemoteSolutionHistoryStauts(): void {
    this._remoteSolutionHistoryStatusPollingTimer = setTimeout(() => {
      this._updateRemoteSolutionHistoryStatus();

      if (!this._remoteSolutionHistoryStatusIsPolling) {
        return;
      }

      this._startPollingOfRemoteSolutionHistoryStatus();
    }, environment.processengine.updateRemoteSolutionHistoryIntervalInMs);
  }

  private _stopPollingOfRemoteSolutionHistoryStatus(): void {
    const noTimerExisting: boolean = this._remoteSolutionHistoryStatusPollingTimer === undefined;
    if (noTimerExisting) {
      return;
    }

    clearTimeout(this._remoteSolutionHistoryStatusPollingTimer);

    this._remoteSolutionHistoryStatusPollingTimer = undefined;
    this._remoteSolutionHistoryStatusIsPolling = false;
  }

  private async _updateRemoteSolutionHistoryStatus(): Promise<void> {
    this.remoteSolutionHistoryWithStatus.forEach(
      async (remoteSolutionWithStatus: RemoteSolutionUriWithStatus): Promise<void> => {
        try {
          const response: Response = await fetch(remoteSolutionWithStatus.uri);

          const data: JSON = await response.json();

          const isResponseFromProcessEngine: boolean = data['name'] === '@process-engine/process_engine_runtime';
          if (!isResponseFromProcessEngine) {
            throw new Error('The response was not send by a ProcessEngine.');
          }

          this.remoteSolutionHistoryStatus.set(remoteSolutionWithStatus.uri, true);
        } catch {
          this.remoteSolutionHistoryStatus.set(remoteSolutionWithStatus.uri, false);
        }
      },
    );
  }

  private async _refreshSolutions(): Promise<void> {
    return this.solutionExplorerList.refreshSolutions();
  }

  private async _openSolutionOrDisplayError(uri: string): Promise<void> {
    try {
      await this.solutionExplorerList.openSolution(uri);
    } catch (error) {
      this._notificationService.showNotification(NotificationType.ERROR, error.message);
    }
  }

  private _loadRemoteSolutionHistory(): Array<string> {
    const remoteSolutionHistoryFromLocalStorage: string | null = localStorage.getItem('remoteSolutionHistory');
    const noHistoryExisting: boolean = remoteSolutionHistoryFromLocalStorage === null;
    const remoteSolutionHistory: Array<string> = noHistoryExisting
      ? []
      : JSON.parse(remoteSolutionHistoryFromLocalStorage);

    return remoteSolutionHistory;
  }

  private _saveRemoteSolutionHistory(remoteSolutionHistory: Array<string>): void {
    const remoteSolutionHistoryString: string = JSON.stringify(remoteSolutionHistory);

    localStorage.setItem('remoteSolutionHistory', remoteSolutionHistoryString);
  }

  private _addSolutionToRemoteSolutionHistory(solutionUri: string): void {
    this._removeSolutionFromSolutionHistroy(solutionUri);

    const remoteSolutionHistory: Array<string> = this._loadRemoteSolutionHistory();

    remoteSolutionHistory.push(solutionUri);

    this._saveRemoteSolutionHistory(remoteSolutionHistory);
  }

  private _removeSolutionFromSolutionHistroy(solutionUri: string): void {
    const remoteSolutionHistory: Array<string> = this._loadRemoteSolutionHistory();

    const uniqueRemoteSolutionHistory: Array<string> = remoteSolutionHistory.filter((remoteSolutionUri: string) => {
      return remoteSolutionUri !== solutionUri;
    });

    this._saveRemoteSolutionHistory(uniqueRemoteSolutionHistory);
  }

  private async _openDiagramOrDisplayError(uri: string): Promise<void> {
    try {
      const openedDiagram: IDiagram = await this.solutionExplorerList.openDiagram(uri);
      const solution: ISolutionEntry = this.solutionExplorerList.getOpenDiagramSolutionEntry();

      this._solutionService.addOpenDiagram(openedDiagram);

      await this._navigateToDetailView(openedDiagram, solution);
    } catch (error) {
      // The diagram may already be opened.
      const diagram: IDiagram | null = await this.solutionExplorerList.getOpenedDiagramByURI(uri);
      const solution: ISolutionEntry = this.solutionExplorerList.getOpenDiagramSolutionEntry();

      const diagramWithURIIsAlreadyOpened: boolean = diagram !== null;
      if (diagramWithURIIsAlreadyOpened) {
        return this._navigateToDetailView(diagram, solution);
      }

      this._notificationService.showNotification(NotificationType.ERROR, error.message);
    }
  }

  private _electronFileOpeningHook = async (_: Event, pathToFile: string): Promise<void> => {
    const uri: string = pathToFile;
    this._openDiagramOrDisplayError(uri);
  };

  private _electronOnMenuOpenDiagramHook = async (_: Event): Promise<void> => {
    this.openDiagram();
  };

  private _electronOnMenuOpenSolutionHook = async (_: Event): Promise<void> => {
    this.openSolution();
  };

  private _electronOnCreateDiagram = async (_: Event): Promise<void> => {
    this._openNewDiagram();
  };

  private _openNewDiagram(): void {
    const uri: string = 'about:open-diagrams';

    this.solutionExplorerList.createDiagram(uri);
  }

  private _createNewDiagram(): void {
    const activeSolutionUri: string = this._router.currentInstruction.queryParams.solutionUri;
    const activeSolution: ISolutionEntry = this._solutionService.getSolutionEntryForUri(activeSolutionUri);

    const activeSolutionCanCreateDiagrams: boolean =
      activeSolution !== undefined && !activeSolution.uri.startsWith('http');

    const uri: string = activeSolutionCanCreateDiagrams ? activeSolutionUri : 'about:open-diagrams';

    this.solutionExplorerList.createDiagram(uri);
  }

  private _registerElectronHooks(): void {
    // Register handler for double-click event fired from "electron.js".
    this._ipcRenderer.on('double-click-on-file', this._electronFileOpeningHook);

    this._ipcRenderer.on('menubar__start_opening_diagram', this._electronOnMenuOpenDiagramHook);
    this._ipcRenderer.on('menubar__start_opening_solution', this._electronOnMenuOpenSolutionHook);

    this._ipcRenderer.on('menubar__start_create_diagram', this._electronOnCreateDiagram);

    // Send event to signal the component is ready to handle the event.
    this._ipcRenderer.send('waiting-for-double-file-click');

    // Check if there was a double click before BPMN-Studio was loaded.
    const fileInfo: IFile = this._ipcRenderer.sendSync('get_opened_file');

    if (fileInfo.path) {
      // There was a file opened before BPMN-Studio was loaded, open it.
      const uri: string = fileInfo.path;
      this._openDiagramOrDisplayError(uri);
    }
  }

  private _removeElectronFileOpeningHooks(): void {
    // Register handler for double-click event fired from "electron.js".
    this._ipcRenderer.removeListener('double-click-on-file', this._electronFileOpeningHook);

    this._ipcRenderer.removeListener('menubar__start_opening_diagram', this._electronOnMenuOpenDiagramHook);
    this._ipcRenderer.removeListener('menubar__start_opening_solution', this._electronOnMenuOpenSolutionHook);

    this._ipcRenderer.removeListener('menubar__start_create_diagram', this._electronOnCreateDiagram);
  }

  private _openDiagramOnDropBehaviour: EventListener = async (event: DragEvent): Promise<void> => {
    event.preventDefault();

    const loadedFiles: FileList = event.dataTransfer.files;

    const urisToOpen: Array<string> = Array.from(loadedFiles).map((file: IFile): string => {
      return file.path;
    });

    const openingPromises: Array<Promise<void>> = urisToOpen.map(
      (uri: string): Promise<void> => {
        return this._openDiagramOrDisplayError(uri);
      },
    );

    await Promise.all(openingPromises);
  };

  // TODO: This method is copied all over the place.
  private async _navigateToDetailView(diagram: IDiagram, solution: ISolutionEntry): Promise<void> {
    await this._router.navigateToRoute('design', {
      diagramName: diagram.name,
      diagramUri: diagram.uri,
      solutionUri: solution.uri,
    });
  }
}
