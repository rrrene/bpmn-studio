import {inject} from 'aurelia-framework';

import {IIdentity} from '@essential-projects/iam_contracts';
import {IDiagram, ISolution} from '@process-engine/solutionexplorer.contracts';
import {ISolutionExplorerService} from '@process-engine/solutionexplorer.service.contracts';

import {EventAggregator} from 'aurelia-event-aggregator';
import {IDiagramState, IDiagramValidationService, ISolutionService, NotificationType} from '../../contracts/index';
import {OpenDiagramStateService} from './OpenDiagramStateService';
import {SolutionExplorerServiceFactory} from './SolutionExplorerServiceFactory';
import {NotificationService} from '../notification-service/notification.service';
import environment from '../../environment';

/**
 * This service allows to keep all opened open diagrams inside a solution.
 *
 * This is needed because the default solution explorer does not keep state
 * about open diagrams.
 *
 * With this service you can retrieve, all opened diagrams inside a
 * solution.
 *
 * To remove a diagram from the solution, call use #closeDiagram().
 */

@inject(
  'DiagramValidationService',
  'SolutionExplorerServiceFactory',
  'SolutionService',
  'OpenDiagramStateService',
  'NotificationService',
  EventAggregator,
)
export class OpenDiagramsSolutionExplorerService implements ISolutionExplorerService {
  public isCreatingDiagram: boolean;

  private validationService: IDiagramValidationService;
  private solutionExplorerToOpenDiagrams: ISolutionExplorerService;
  private uriOfOpenDiagramService: string = 'about:open-diagrams';
  private nameOfOpenDiagramService: string = 'Open Diagrams';
  private openedDiagrams: Array<IDiagram> = [];
  private solutionService: ISolutionService;
  private openDiagramStateService: OpenDiagramStateService;
  private notificationService: NotificationService;
  private eventAggregator: EventAggregator;

  private diagramWasChangedByStudio: boolean = false;

  constructor(
    validationService: IDiagramValidationService,
    serviceFactory: SolutionExplorerServiceFactory,
    solutionService: ISolutionService,
    openDiagramStateService: OpenDiagramStateService,
    notificationService: NotificationService,
    eventAggregator: EventAggregator,
  ) {
    this.validationService = validationService;
    this.setSolutionExplorer(serviceFactory);
    this.solutionService = solutionService;
    this.openDiagramStateService = openDiagramStateService;
    this.notificationService = notificationService;
    this.eventAggregator = eventAggregator;

    this.eventAggregator.subscribe(environment.events.diagramChangedByStudio, (cause: string) => {
      this.diagramWasChangedByStudio = true;

      const saveAsUsed: boolean = cause === 'save-as';
      const resetTimeout: number = saveAsUsed ? 1500 : 500;

      setTimeout(() => {
        this.diagramWasChangedByStudio = false;
      }, resetTimeout);
    });
  }

  public getOpenedDiagrams(): Array<IDiagram> {
    return this.openedDiagrams;
  }

  /**
   * Gets the open diagram with the given uri, if the diagram was opened
   * before.
   */
  public getOpenedDiagramByURI(uri: string): IDiagram | null {
    const indexOfDiagram: number = this.findIndexOfDiagramWithURI(uri);

    const diagramWasNotFound: boolean = indexOfDiagram < 0;
    if (diagramWasNotFound) {
      return null;
    }

    const diagramWithURI: IDiagram = this.openedDiagrams[indexOfDiagram];

    return diagramWithURI;
  }

  public openSolution(pathspec: string, identity: IIdentity): Promise<void> {
    return Promise.resolve();
  }

  public loadSolution(): Promise<ISolution> {
    const solution: ISolution = {
      diagrams: this.openedDiagrams,
      name: this.nameOfOpenDiagramService,
      uri: this.uriOfOpenDiagramService,
    };
    return Promise.resolve(solution);
  }

  public async openDiagram(uri: string, identity: IIdentity): Promise<IDiagram> {
    const uriIsNoBpmnFile: boolean = !uri.endsWith('.bpmn');
    if (uriIsNoBpmnFile) {
      throw new Error('File is no BPMN file.');
    }

    const uriAlreadyOpened: boolean = this.findIndexOfDiagramWithURI(uri) >= 0;
    if (uriAlreadyOpened) {
      throw new Error('This diagram is already opened.');
    }

    const lastIndexOfSlash: number = uri.lastIndexOf('/');
    const lastIndexOfBackSlash: number = uri.lastIndexOf('\\');
    const indexBeforeFilename: number = Math.max(lastIndexOfSlash, lastIndexOfBackSlash);

    const filepath: string = uri.substring(0, indexBeforeFilename);

    const filename: string = uri.replace(/^.*[\\/]/, '');
    const filenameWithoutEnding: string = filename.replace('.bpmn', '');

    let diagram: IDiagram;

    const isUnsavedDiagram: boolean = filepath === 'about:open-diagrams';
    if (isUnsavedDiagram) {
      const diagramState: IDiagramState = this.openDiagramStateService.loadDiagramState(uri);

      diagram = {
        name: filenameWithoutEnding,
        xml: diagramState.data.xml,
        uri: uri,
      };
    } else {
      await this.solutionExplorerToOpenDiagrams.openSolution(filepath, identity);

      diagram = await this.solutionExplorerToOpenDiagrams.loadDiagram(filenameWithoutEnding, filepath);

      const diagramHasNoState: boolean = this.openDiagramStateService.loadDiagramState(uri) === null;
      if (diagramHasNoState) {
        this.openDiagramStateService.saveDiagramState(uri, diagram.xml, undefined, [], false);
      }

      await this.validationService
        .validate(diagram.xml)
        .isXML()
        .isBPMN()
        .throwIfError();
    }

    const diagramIsStoredOnFilesystem: boolean = !diagram.uri.startsWith('about:open-diagrams');
    if (diagramIsStoredOnFilesystem) {
      this.watchFile(diagram.uri, (event: string, previousFilepath: string, newFilename: string): void => {
        if (this.diagramWasChangedByStudio) {
          return;
        }

        const diagramState: IDiagramState = this.openDiagramStateService.loadDiagramState(diagram.uri);

        const diagramHasState: boolean = diagramState !== null;
        if (diagramHasState) {
          diagramState.metaData.isChanged = true;

          this.openDiagramStateService.updateDiagramState(diagram.uri, diagramState);
        }

        this.eventAggregator.publish(environment.events.diagramChangedOutsideTheStudio, previousFilepath);

        let notificationMessage: string;

        const basename = previousFilepath.split('/').reverse()[0];
        const eventIsRename: boolean = event === 'rename';
        const eventIsChange: boolean = event === 'change';
        const eventIsRestore: boolean = event === 'restore';
        if (eventIsRename) {
          notificationMessage = `The diagram "${basename}" was moved/renamed on disk.`;
        } else if (eventIsChange) {
          notificationMessage = `The diagram "${basename}" was changed on disk.`;
        } else if (eventIsRestore) {
          notificationMessage = `The diagram "${basename}" was restored on disk.`;
        }

        this.notificationService.showNonDisappearingNotification(NotificationType.WARNING, notificationMessage);
      });
    }

    this.openedDiagrams.push(diagram);

    return diagram;
  }

  public closeDiagram(diagram: IDiagram): Promise<void> {
    const index: number = this.findIndexOfDiagramWithURI(diagram.uri);

    this.openedDiagrams.splice(index, 1);
    this.openDiagramStateService.deleteDiagramState(diagram.uri);
    this.unwatchFile(diagram.uri);

    return Promise.resolve();
  }

  public renameDiagram(diagram: IDiagram, newName: string): Promise<IDiagram> {
    throw new Error('Method not supported.');
  }

  public deleteDiagram(diagram: IDiagram): Promise<void> {
    throw new Error('Method not supported.');
  }

  public async loadDiagram(diagramName: string): Promise<IDiagram> {
    const diagramToLoad: IDiagram = this.openedDiagrams.find((diagram: IDiagram) => {
      return diagram.name === diagramName;
    });

    return diagramToLoad;
  }

  public saveSolution(solution: ISolution, pathspec?: string): Promise<void> {
    throw new Error('Method not supported.');
  }

  public saveDiagram(diagram: IDiagram, pathspec?: string): Promise<void> {
    return this.solutionExplorerToOpenDiagrams.saveDiagram(diagram, pathspec);
  }

  public async openDiagramFromSolution(diagramUri: string, identity: IIdentity): Promise<IDiagram> {
    const openedDiagram: IDiagram = await this.openDiagram(diagramUri, identity);

    this.solutionService.addOpenDiagram(openedDiagram);

    return openedDiagram;
  }

  public watchFile(
    filepath: string,
    callback: (event: string, previousFilepath: string, newFilename: string) => void,
  ): void {
    this.solutionExplorerToOpenDiagrams.watchFile(filepath, callback);
  }

  public unwatchFile(filepath: string): void {
    this.solutionExplorerToOpenDiagrams.unwatchFile(filepath);
  }

  private findIndexOfDiagramWithURI(uri: string): number {
    const index: number = this.openedDiagrams.findIndex((diagram: IDiagram): boolean => {
      return diagram.uri === uri;
    });

    return index;
  }

  private async setSolutionExplorer(serviceFactory: SolutionExplorerServiceFactory): Promise<void> {
    this.solutionExplorerToOpenDiagrams = await serviceFactory.newFileSystemSolutionExplorer();
  }
}
