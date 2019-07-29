import {IDiagram} from '@process-engine/solutionexplorer.contracts';

import {ISolutionEntry} from './ISolutionEntry';

export interface ISolutionService {
  /**
   * Adds a SolutionEntry to the service.
   * @param solutionEntry The SolutionEntry to add.
   */
  addSolutionEntry(solutionEntry: ISolutionEntry): void;

  /**
   * Gets a specific SolutionEntry identified by its URI.
   * @param uri The URI of the searched SolutionEntry.
   */
  getSolutionEntryForUri(uri: string): ISolutionEntry;

  /**
   * Gets a list of all persisted solutions from the last session.
   */
  getPersistedEntries(): Array<ISolutionEntry>;

  /**
   * Gets a list of all currently connected remote solutions.
   */
  getRemoteSolutionEntries(): Array<ISolutionEntry>;

  /**
   * Gets a list of all currently connected solutions.
   */
  getAllSolutionEntries(): Array<ISolutionEntry>;

  /**
   * Deletes a specific solution indetified by its ID.
   * @param uri The uri of the solution entry to delete.
   */
  removeSolutionEntryByUri(uri: string): void;

  /**
   * Adds a diagram to the service.
   * @param diagram The diagram to add.
   */
  addOpenDiagram(diagram: IDiagram): void;

  /**
   * Removes an open diagram from the service identified by its URI.
   * @param diagramUri The uri of the diagram to remove.
   */
  removeOpenDiagramByUri(diagramUri: string): void;

  /**
   * Returns a list of all open diagrams in the service.
   */
  getOpenDiagrams(): Array<IDiagram>;

  /**
   * Persists the currently opened Solutions in the LocalStorage.
   */
  persistSolutionsInLocalStorage(): void;
}
