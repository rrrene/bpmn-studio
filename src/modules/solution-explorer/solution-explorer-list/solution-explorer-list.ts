import {EventAggregator, Subscription} from 'aurelia-event-aggregator';
import {computedFrom, inject} from 'aurelia-framework';
import {Router} from 'aurelia-router';

import {IIdentity} from '@essential-projects/iam_contracts';
import {IDiagram, ISolution} from '@process-engine/solutionexplorer.contracts';
import {ISolutionExplorerService} from '@process-engine/solutionexplorer.service.contracts';

import {
  IAuthenticationService,
  ILoginResult,
  ISolutionEntry,
  ISolutionService,
  IUserIdentity,
} from '../../../contracts';
import {OpenDiagramsSolutionExplorerService} from '../../../services/solution-explorer-services/OpenDiagramsSolutionExplorerService';
import {SolutionExplorerServiceFactory} from '../../../services/solution-explorer-services/SolutionExplorerServiceFactory';
import {SolutionExplorerSolution} from '../solution-explorer-solution/solution-explorer-solution';

interface IUriToViewModelMap {
  [key: string]: SolutionExplorerSolution;
}

@inject(Router, EventAggregator, 'SolutionExplorerServiceFactory', 'AuthenticationService', 'SolutionService', 'OpenDiagramService')
export class SolutionExplorerList {
  public internalSolutionUri: string;
  /**
   * Reference on the service used to open open diagrams.
   * This service is also put inside the map.
   */
  public openDiagramService: OpenDiagramsSolutionExplorerService;

  private _router: Router;
  private _eventAggregator: EventAggregator;
  private _solutionExplorerServiceFactory: SolutionExplorerServiceFactory;
  private _authenticationService: IAuthenticationService;
  private _solutionService: ISolutionService;
  /*
   * Contains all opened solutions.
   */
  private _openedSolutions: Array<ISolutionEntry> = [];
  /*
   * Keep a seperate map of all viewmodels for the solutions entries.
   * The uri maps to the viewmodel. The contents of this map get set by aurelia
   * in the html view.
   */
  public solutionEntryViewModels: IUriToViewModelMap = {};

  constructor(
    router: Router,
    eventAggregator: EventAggregator,
    solutionExplorerServiceFactory: SolutionExplorerServiceFactory,
    authenticationService: IAuthenticationService,
    solutionService: ISolutionService,
    openDiagramService: OpenDiagramsSolutionExplorerService,
  ) {
    this._router = router;
    this._eventAggregator = eventAggregator;
    this._solutionExplorerServiceFactory = solutionExplorerServiceFactory;
    this._authenticationService = authenticationService;
    this._solutionService = solutionService;
    this.openDiagramService = openDiagramService;

    const canReadFromFileSystem: boolean = (window as any).nodeRequire;
    if (canReadFromFileSystem) {
      this._createOpenDiagramServiceEntry();
    }

    // Allows us to debug the solution explorer list.
    (window as any).solutionList = this;

    this.internalSolutionUri = window.localStorage.getItem('InternalProcessEngineRoute');
  }

  /**
   * Refreshes all currently opened solutions.
   */
  public async refreshSolutions(): Promise<void> {
    const refreshPromises: Array<Promise<void>> = Object.values(this.solutionEntryViewModels)
      .filter((viewModel: SolutionExplorerSolution): boolean => {
        const viewModelExists: boolean = viewModel !== undefined && viewModel !== null;
        return viewModelExists;
      })
      .map((viewModel: SolutionExplorerSolution): Promise<void> => {
        return viewModel.updateSolution();
      });

    await Promise.all(refreshPromises);
  }

  public toggleSolution(solutionEntry: ISolutionEntry): void {
    if (solutionEntry.isOpenDiagramService) {
      return;
    }

    solutionEntry.hidden = !solutionEntry.hidden;
    this._solutionService.persistSolutionsInLocalStorage();
  }

  public solutionIsInternalSolution(solution: ISolutionEntry): boolean {
    const solutionIsInternalSolution: boolean = solution.uri === this.internalSolutionUri;

    return solutionIsInternalSolution;
  }

  public openSettings(): void {
    this._router.navigateToRoute('settings');
  }

  public async openDiagram(uri: string): Promise<IDiagram> {
    const identity: IIdentity = this._createIdentityForSolutionExplorer();

    const diagram: IDiagram = await this.openDiagramService.openDiagram(uri, identity);

    return diagram;
  }

  /**
   * Gets the diagram with the given uri, if the diagram was opened
   * before.
   */
  public getOpenedDiagramByURI(uri: string): IDiagram | null {
    return this.openDiagramService.getOpenedDiagramByURI(uri);
  }

  public getOpenDiagramSolutionEntry(): ISolutionEntry {
    return this._openedSolutions.find((entry: ISolutionEntry) => {
      return entry.uri === 'about:open-diagrams';
    });
  }

  public async openSolution(uri: string, insertAtBeginning: boolean = false, identity?: IIdentity): Promise<void> {
    const uriIsRemote: boolean = uri.startsWith('http');

    let solutionExplorer: ISolutionExplorerService;

    if (uriIsRemote) {
      solutionExplorer = await this._solutionExplorerServiceFactory.newManagementApiSolutionExplorer();
    } else {
      solutionExplorer = await this._solutionExplorerServiceFactory.newFileSystemSolutionExplorer();
    }

    const identityIsNotSet: boolean = identity === undefined || identity === null;
    if (identityIsNotSet) {
      identity = this._createIdentityForSolutionExplorer();
    }

    let processEngineVersion: string;
    try {
      if (uriIsRemote) {
        const response: Response = await fetch(uri);

        const responseJSON: object & {version: string} = await response.json();

        const isResponseFromProcessEngine: boolean = responseJSON['name'] === '@process-engine/process_engine_runtime';
        if (!isResponseFromProcessEngine) {
          throw new Error('The response was not send by a ProcessEngine.');
        }

        processEngineVersion = responseJSON.version;
      }

      await solutionExplorer.openSolution(uri, identity);
    } catch (error) {
      this._solutionService.removeSolutionEntryByUri(uri);

      const errorIsNoProcessEngine: boolean = error.message === 'The response was not send by a ProcessEngine.'
                                           || error.message === 'Unexpected token < in JSON at position 0';
      if (errorIsNoProcessEngine) {
        throw new Error('Could not find remote solution for that uri.');
      }

      const errorIsFailedToFetch: boolean = error.message === 'Failed to fetch';
      if (errorIsFailedToFetch) {
        /**
         * TODO: The error message only contains 'Failed to fetch' if the connection
         * failed. A more detailed cause (such as Connection Refused) would
         * be better. This needs to be implemented in the service or repository.
         */
        throw new Error('Failed to receive the list of ProcessModels from the endpoint');
      }

      throw error;
    }

    const newOpenedSolution: ISolution = await solutionExplorer.loadSolution();
    const solutionURI: string = newOpenedSolution.uri;

    const arrayAlreadyContainedURI: boolean = this._getIndexOfSolution(solutionURI) >= 0;

    if (arrayAlreadyContainedURI) {
      throw new Error('Solution is already opened.');
    }

    this._addSolutionEntry(uri, solutionExplorer, identity, insertAtBeginning, processEngineVersion);
  }

  /**
   * Closes a solution, if the uri is currently not opened, nothing will
   * happen.
   *
   * @param uri the uri of the solution to close.
   */
  public async closeSolution(uri: string): Promise<void> {

    /**
     * If the user closes the Solution which contains the diagram, which he still
     * has opened, he gets navigated to the start page.
     */
    const currentOpenDiagram: string = this._router.currentInstruction.queryParams.solutionUri;
    const diagramOfClosedSolutionOpen: boolean = uri.includes(currentOpenDiagram);

    if (diagramOfClosedSolutionOpen) {
      /**
       * We only want to close the open Solution, if the user does not have
       * unsaved changes.
       */
      const subscription: Subscription = this._eventAggregator.subscribe('router:navigation:success', () => {
        this._cleanupSolution(uri);
        subscription.dispose();
      });

      this._router.navigateToRoute('start-page');

    } else {
      this._cleanupSolution(uri);
    }
  }

  public async login(solutionEntry: ISolutionEntry): Promise<void> {
    const result: ILoginResult = await this._authenticationService.login(solutionEntry.authority);

    const couldNotConnectToAuthority: boolean = result === undefined;
    if (couldNotConnectToAuthority) {

      return;
    }

    const userIsNotLoggedIn: boolean = result.idToken === 'access_denied';
    if (userIsNotLoggedIn) {

      return;
    }

    const identity: IIdentity = {
      token: result.accessToken,
      userId: result.idToken,
    };

    solutionEntry.identity = identity;
    solutionEntry.isLoggedIn = true;
    solutionEntry.userName = result.identity.name;

    await solutionEntry.service.openSolution(solutionEntry.uri, solutionEntry.identity);
    this._solutionService.persistSolutionsInLocalStorage();
  }

  public async logout(solutionEntry: ISolutionEntry): Promise<void> {
    await this._authenticationService.logout(solutionEntry.authority, solutionEntry.identity);

    solutionEntry.identity = this._createIdentityForSolutionExplorer();
    solutionEntry.isLoggedIn = false;
    solutionEntry.userName = undefined;

    await solutionEntry.service.openSolution(solutionEntry.uri, solutionEntry.identity);
    this._solutionService.persistSolutionsInLocalStorage();

    this._router.navigateToRoute('start-page');
  }

  /**
   * Starts the creation process of a new diagram inside the given solution
   * entry.
   */
  public async createDiagram(solutionEntryOrUri: any): Promise<void> {
    const hiddenPropertyExists: boolean = solutionEntryOrUri.hidden !== undefined;
    if (hiddenPropertyExists && solutionEntryOrUri.hidden) {
      this.toggleSolution(solutionEntryOrUri);
    }

    const uri: string = solutionEntryOrUri.uri ? solutionEntryOrUri.uri : solutionEntryOrUri;

    let viewModelOfEntry: SolutionExplorerSolution = this.solutionEntryViewModels[uri];

    const solutionIsNotOpened: boolean = viewModelOfEntry === undefined || viewModelOfEntry === null;
    if (solutionIsNotOpened) {
      const uriIsOpenDiagrams: boolean = uri.startsWith('about:open-diagrams');
      if (uriIsOpenDiagrams) {
        this.openDiagramService.isCreatingDiagram = true;
      } else {
        await this.openSolution(uri);
      }
    }

    /**
     * Waiting for next tick of the browser here because the new solution wouldn't
     * be added if we wouldn't do that.
     */
    window.setTimeout(() => {
      if (solutionIsNotOpened) {
        viewModelOfEntry = this.solutionEntryViewModels[uri];
      }

      viewModelOfEntry.startCreationOfNewDiagram();
      this.openDiagramService.isCreatingDiagram = false;
    }, 0);
  }

  public getSolutionName(solutionUri: string): string {
    const solutionIsRemote: boolean = solutionUri.startsWith('http');
    if (solutionIsRemote) {
      return solutionUri;
    }

    const isOpenDiagrams: boolean = solutionUri === 'about:open-diagrams';
    if (isOpenDiagrams) {
      return 'Open Diagrams';
    }

    const lastIndexOfSlash: number = solutionUri.lastIndexOf('/');
    const lastIndexOfBackSlash: number = solutionUri.lastIndexOf('\\');
    const lastFolderIndex: number = Math.max(lastIndexOfSlash, lastIndexOfBackSlash) + 1;

    const solutionName: string = solutionUri.substring(lastFolderIndex);

    const solutionNameIsEmpty: boolean = solutionName.length === 0;
    if (solutionNameIsEmpty) {
      return solutionUri;
    }

    return solutionName;
  }

  public solutionEntryIsRemote(solutionEntry: ISolutionEntry): boolean {
    return solutionEntry.uri.startsWith('http');
  }

  /*
   * Give aurelia a hint on what objects to observe.
   * If we dont do this, it falls back to active pooling which is slow.
   * `openDiagramService._openedDiagrams.length` observed because
   * aurelia cannot see the business rules happening in this._shouldDisplaySolution().
   */
  @computedFrom('_openedSolutions.length', 'openDiagramService._openedDiagrams.length', 'openDiagramService.isCreatingDiagram')
  public get openedSolutions(): Array<ISolutionEntry> {
    const filteredEntries: Array<ISolutionEntry> = this._openedSolutions
      .filter(this._shouldDisplaySolution);

    const sortedEntries: Array<ISolutionEntry> = filteredEntries.sort((solutionA: ISolutionEntry, solutionB: ISolutionEntry) => {
      if (solutionA.isOpenDiagramService) {
        return -1;
      }

      const solutionAIsInternalProcessEngine: boolean = solutionA.uri === window.localStorage.getItem('InternalProcessEngineRoute');
      if (solutionAIsInternalProcessEngine) {
        return 1;
      }

      return solutionA.uri.startsWith('http') && !solutionB.uri.startsWith('http')
              ? 1
              : -1;
    });

    return sortedEntries;
  }

  private _cleanupSolution(uri: string): void {
   const indexOfSolutionToBeRemoved: number = this._getIndexOfSolution(uri);

   const uriNotFound: boolean = indexOfSolutionToBeRemoved < 0;
   if (uriNotFound) {

      return;
    }
   this._openedSolutions.splice(indexOfSolutionToBeRemoved, 1);

   const entryToRemove: ISolutionEntry = this._solutionService.getSolutionEntryForUri(uri);
   this._solutionService.removeSolutionEntryByUri(entryToRemove.uri);
  }
  /**
   * Add entry for single file service.
   */

  private _createOpenDiagramServiceEntry(): void {
    const identity: IIdentity = this._createIdentityForSolutionExplorer();

    this._addSolutionEntry('about:open-diagrams', this.openDiagramService, identity, true);
  }

  private _getFontAwesomeIconForSolution(service: ISolutionExplorerService, uri: string): string {
    const solutionIsOpenedFromRemote: boolean = uri.startsWith('http');
    if (solutionIsOpenedFromRemote) {
      return 'fa-database';
    }

    const solutionIsOpenDiagrams: boolean = service === this.openDiagramService;
    if (solutionIsOpenDiagrams) {
      return 'fa-copy';
    }

    return 'fa-folder';
  }

  private _canCreateNewDiagramsInSolution(service: ISolutionExplorerService, uri: string): boolean {
    const solutionIsNotOpenedFromRemote: boolean = !uri.startsWith('http');
    const solutionIsNotOpenDiagrams: boolean = service !== this.openDiagramService;

    return solutionIsNotOpenedFromRemote && solutionIsNotOpenDiagrams;
  }

  private _canCloseSolution(service: ISolutionExplorerService, uri: string): boolean {
    const solutionIsNotOpenDiagrams: boolean = !this._isOpenDiagramService(service);

    const internalProcessEngineRoute: string = window.localStorage.getItem('InternalProcessEngineRoute');
    const solutionIsNotInternalSolution: boolean = uri !== internalProcessEngineRoute;

    return solutionIsNotOpenDiagrams && solutionIsNotInternalSolution;
  }

  private _isOpenDiagramService(service: ISolutionExplorerService): boolean {
    return service === this.openDiagramService;
  }

  private _shouldDisplaySolution: (value: ISolutionEntry, index: number, array: Array<ISolutionEntry>) => boolean =
    (entry: ISolutionEntry): boolean => {
      const service: ISolutionExplorerService = entry.service;

      const isOpenDiagramService: boolean = (service as any).getOpenedDiagrams !== undefined;
      if (isOpenDiagramService) {
        const openDiagramService: OpenDiagramsSolutionExplorerService = service as OpenDiagramsSolutionExplorerService;

        const someDiagramsAreOpened: boolean = openDiagramService.getOpenedDiagrams().length > 0;
        const isCreatingDiagram: boolean = this.openDiagramService.isCreatingDiagram;

        return someDiagramsAreOpened || isCreatingDiagram;
      }

      return true;
    }

  private _getIndexOfSolution(uri: string): number {
    const indexOfSolutionWithURI: number = this._openedSolutions.findIndex((element: ISolutionEntry): boolean => {
      return element.uri === uri;
    });

    return indexOfSolutionWithURI;
  }

  private async _addSolutionEntry(
    uri: string, service: ISolutionExplorerService,
    identity: IIdentity,
    insertAtBeginning: boolean,
    processEngineVersion?: string,
  ): Promise<void> {
    const isOpenDiagramService: boolean = this._isOpenDiagramService(service);
    const fontAwesomeIconClass: string = this._getFontAwesomeIconForSolution(service, uri);
    const canCloseSolution: boolean = this._canCloseSolution(service, uri);
    const canCreateNewDiagramsInSolution: boolean = this._canCreateNewDiagramsInSolution(service, uri);
    const authority: string = await this._getAuthorityForSolution(uri);
    const hidden: boolean = this._getHiddenStateForSolutionUri(uri);

    const authorityIsUndefined: boolean = authority === undefined;

    const isLoggedIn: boolean = authorityIsUndefined
                                ? false
                                : await this._authenticationService.isLoggedIn(authority, identity);

    let userName: string;

    if (isLoggedIn) {
      const userIdentity: IUserIdentity = await this._authenticationService.getUserIdentity(authority, identity);
      userName = userIdentity.name;
    }

    const entry: ISolutionEntry = {
      uri,
      service,
      fontAwesomeIconClass,
      canCloseSolution,
      canCreateNewDiagramsInSolution,
      isOpenDiagramService,
      identity,
      authority,
      isLoggedIn,
      userName,
      processEngineVersion,
      hidden,
    };

    this._solutionService.addSolutionEntry(entry);

    if (insertAtBeginning) {
      this._openedSolutions.splice(1, 0, entry);
    } else {
      this._openedSolutions.push(entry);
    }
  }

  private _getHiddenStateForSolutionUri(uri: string): boolean {
    const persistedSolutions: Array<ISolutionEntry> = this._solutionService.getPersistedEntries();
    const solutionToLoad: ISolutionEntry = persistedSolutions.find((solution: ISolutionEntry) => solution.uri === uri);

    if (!solutionToLoad) {
      return false;
    }

    return solutionToLoad.hidden ? solutionToLoad.hidden : false;
  }

  private _createIdentityForSolutionExplorer(): IIdentity {

    const accessToken: string = this._createDummyAccessToken();
    // TODO: Get the identity from the IdentityService of `@process-engine/iam`
    const identity: IIdentity = {
      token: accessToken,
      userId: '', // Provided by the IdentityService.
    };

    return identity;
  }

  private async _getAuthorityForSolution(solutionUri: string): Promise<string> {
    const solutionIsRemote: boolean = solutionUri.startsWith('http');

    if (solutionIsRemote) {
      const request: Request = new Request(`${solutionUri}/security/authority`, {
        method: 'GET',
        mode: 'cors',
        referrer: 'no-referrer',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });

      const response: Response = await fetch(request);
      const authority: string = (await response.json()).authority;

      return authority;
    }

  }

  private _createDummyAccessToken(): string {
    const dummyAccessTokenString: string = 'dummy_token';
    const base64EncodedString: string = btoa(dummyAccessTokenString);

    return base64EncodedString;
  }

}
