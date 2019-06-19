import {inject} from 'aurelia-framework';

import {IDiagram} from '@process-engine/solutionexplorer.contracts';

import {ISolutionEntry, ISolutionService} from '../../contracts';
import {SolutionExplorerServiceFactory} from '../solution-explorer-services/SolutionExplorerServiceFactory';

@inject('SolutionExplorerServiceFactory')
export class SolutionService implements ISolutionService {
  private _allSolutionEntries: Array<ISolutionEntry> = [];
  private _serviceFactory: SolutionExplorerServiceFactory;
  private _persistedEntries: Array<ISolutionEntry> = [];
  private _persistedOpenDiagrams: Array<IDiagram> = [];

  constructor(serviceFactory: SolutionExplorerServiceFactory) {
    this._serviceFactory = serviceFactory;

    const openedSolutions: Array<ISolutionEntry> = this._getSolutionFromLocalStorage();
    this._persistedOpenDiagrams = this._getOpenDiagramsFromLocalStorage();

    const openedSolutionsAreNotSet: boolean = openedSolutions === null;
    if (openedSolutionsAreNotSet) {
      return;
    }

    openedSolutions.forEach(async(solution: ISolutionEntry) => {
      const solutionIsRemote: boolean = solution.uri.startsWith('http');

      solution.service = solutionIsRemote
        ? await this._serviceFactory.newManagementApiSolutionExplorer()
        : await this._serviceFactory.newFileSystemSolutionExplorer();
    });

    this._persistedEntries = openedSolutions;
    this._allSolutionEntries = this._allSolutionEntries.concat(openedSolutions);
  }

  /**
   * SOLUTIONS
   */

  public addSolutionEntry(solutionEntry: ISolutionEntry): void {

    const solutionWithSameUri: ISolutionEntry = this._allSolutionEntries.find((entry: ISolutionEntry) => {
      const entryHasSameUri: boolean = entry.uri === solutionEntry.uri;

      return entryHasSameUri;
    });
    const solutionIsAlreadyOpenend: boolean = solutionWithSameUri !== undefined;
    if (solutionIsAlreadyOpenend) {
      this.removeSolutionEntryByUri(solutionWithSameUri.uri);
    }

    this._allSolutionEntries.push(solutionEntry);
    this.persistSolutionsInLocalStorage();
  }

  public getPersistedEntries(): Array<ISolutionEntry> {
    return this._persistedEntries;
  }

  public getSolutionEntryForUri(uri: string): ISolutionEntry {
    const solutionEntry: ISolutionEntry = this._allSolutionEntries.find((entry: ISolutionEntry) => {
      const entryUriIsSearchedUri: boolean = entry.uri === uri;

      return entryUriIsSearchedUri;
    });

    return solutionEntry;
  }

  public getRemoteSolutionEntries(): Array<ISolutionEntry> {
    const remoteEntries: Array<ISolutionEntry> = this._allSolutionEntries.filter((entry: ISolutionEntry) => {
      return entry.uri.startsWith('http');
    });

    return remoteEntries;
  }

  public getAllSolutionEntries(): Array<ISolutionEntry> {
    return this._allSolutionEntries;
  }

  public removeSolutionEntryByUri(uri: string): void {
    const solutionToRemove: ISolutionEntry = this._allSolutionEntries.find((entry: ISolutionEntry) => {
      return entry.uri === uri;
    });

    const solutionNotFound: boolean = solutionToRemove === undefined;
    if (solutionNotFound) {
      return;
    }

    this._allSolutionEntries.splice(this._allSolutionEntries.indexOf(solutionToRemove), 1);
    this.persistSolutionsInLocalStorage();
  }

  /**
   * OPEN DIAGRAMS
   */

  public addOpenDiagram(diagramToAdd: IDiagram): void {
    const indexOfDiagram: number = this._persistedOpenDiagrams.findIndex((diagram: IDiagram) => diagram.uri === diagramToAdd.uri);
    const diagramIsPersisted: boolean = indexOfDiagram >= 0;

    if (diagramIsPersisted) {
      this._persistedOpenDiagrams[indexOfDiagram] = diagramToAdd;
    } else {
      this._persistedOpenDiagrams.push(diagramToAdd);
    }

    this._persistOpenDiagramsInLocalStorage();
  }

  public removeOpenDiagramByUri(diagramUri: string): void {
    const indexOfDiagramToRemove: number = this._persistedOpenDiagrams.findIndex((diagram: IDiagram) => {
      return diagram.uri === diagramUri;
    });

    this._persistedOpenDiagrams.splice(indexOfDiagramToRemove, 1);
    this._persistOpenDiagramsInLocalStorage();
  }

  public getOpenDiagrams(): Array<IDiagram> {
    return this._persistedOpenDiagrams;
  }

  public persistSolutionsInLocalStorage(): void {
    /**
     * Right now the open diagram solution entry doesn't get persisted.
     */
    const entriesToPersist: Array<ISolutionEntry> = this._allSolutionEntries.filter((entry: ISolutionEntry) => {
      const entryIsNotOpenDiagramSolution: boolean = entry.uri !== 'Open Diagrams';

      return entryIsNotOpenDiagramSolution;
    });

    window.localStorage.setItem('openedSolutions', JSON.stringify(entriesToPersist));
    this._persistedEntries = entriesToPersist;
  }

  private _getSolutionFromLocalStorage(): Array<ISolutionEntry> {
    const openedSolutions: Array<ISolutionEntry> = JSON.parse(window.localStorage.getItem('openedSolutions'));

    return openedSolutions;
  }

  private _getOpenDiagramsFromLocalStorage(): Array<IDiagram> {
    const openDiagrams: Array<IDiagram> = JSON.parse(window.localStorage.getItem('OpenDiagrams'));
    const openDiagramsWerePersisted: boolean = openDiagrams !== null;

    return openDiagramsWerePersisted ? openDiagrams : [];
  }

  private _persistOpenDiagramsInLocalStorage(): void {

    window.localStorage.setItem('OpenDiagrams', JSON.stringify(this._persistedOpenDiagrams));
  }
}
