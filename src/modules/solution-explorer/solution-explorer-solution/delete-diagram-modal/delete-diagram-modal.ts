/* tslint:disable:no-use-before-declare */
/**
 * We are disabling this rule here because we need this kind of statement in the
 * functions used in the promise of the modal.
*/
import {inject} from 'aurelia-framework';
import {Router} from 'aurelia-router';

import {IDiagram, ISolution} from '@process-engine/solutionexplorer.contracts';
import {ISolutionExplorerService} from '@process-engine/solutionexplorer.service.contracts';

import {NotificationService} from '../../../../services/notification-service/notification.service';
import {OpenDiagramsSolutionExplorerService} from '../../../../services/solution-explorer-services/OpenDiagramsSolutionExplorerService';
import {OpenDiagramStateService} from '../../../../services/solution-explorer-services/OpenDiagramStateService';

@inject('NotificationService', 'OpenDiagramStateService', Router, 'OpenDiagramService')
export class DeleteDiagramModal {
  public showModal: boolean = false;
  public diagram: IDiagram;
  public deleteDiagramModal: DeleteDiagramModal = this;

  private _solutionService: ISolutionExplorerService;
  private _notificationService: NotificationService;
  private _openDiagramStateService: OpenDiagramStateService;
  private _openDiagramService: OpenDiagramsSolutionExplorerService;
  private _router: Router;

  constructor(
    notificationService: NotificationService,
    openDiagramStateService: OpenDiagramStateService,
    router: Router,
    openDiagramService: OpenDiagramsSolutionExplorerService,
    ) {
    this._notificationService = notificationService;
    this._openDiagramStateService = openDiagramStateService;
    this._router = router;
    this._openDiagramService = openDiagramService;
  }

  public async show(diagram: IDiagram, solutionService: ISolutionExplorerService): Promise<boolean> {
    this.diagram = diagram;
    this._solutionService = solutionService;


    this.showModal = true;

    const deletionPromise: Promise<boolean> = new Promise((resolve: Function, reject: Function): void => {
      const cancelDeletion: IEventFunction = (): void => {
        this._closeModal();

        resolve(false);

        document.getElementById('cancelDeleteDiagramButton').removeEventListener('click', cancelDeletion);
        document.getElementById('deleteDiagramButton').removeEventListener('click', proceedDeletion);
      };

      const proceedDeletion: IEventFunction = async(): Promise<void> => {
        await this._deleteDiagram();

        resolve(true);

        document.getElementById('cancelDeleteDiagramButton').removeEventListener('click', cancelDeletion);
        document.getElementById('deleteDiagramButton').removeEventListener('click', proceedDeletion);
      };

      setTimeout(() => {
        document.getElementById('cancelDeleteDiagramButton').addEventListener('click', cancelDeletion, {once: true});
        document.getElementById('deleteDiagramButton').addEventListener('click', proceedDeletion, {once: true});
      }, 0);
    });

    return deletionPromise;
  }

  private _closeModal(): void {
    this.diagram = undefined;
    this._solutionService = undefined;

    this.showModal = false;
  }

  private async _deleteDiagram(): Promise<void> {
    try {
      await this._solutionService.deleteDiagram(this.diagram);
    } catch (error) {
      const message: string = `Unable to delete the diagram: ${error.message}`;

      this._notificationService.showNotification(NotificationType.ERROR, message);
    }

    this._openDiagramStateService.deleteDiagramState(this.diagram.uri);

    const diagramIndex: number = this._openDiagramService
      .getOpenedDiagrams()
      .findIndex((diagram: IDiagram) => diagram.uri === this.diagram.uri);

    const searchIndex: number = diagramIndex === 0 ? diagramIndex + 1 : diagramIndex - 1;

    const diagramToNavigateTo: IDiagram = this._openDiagramService
      .getOpenedDiagrams()
      .find((diagram: IDiagram, index: number) => {
        return index === searchIndex;
      });

    const activeSolution: ISolution = await this._solutionService.loadSolution();
    const diagramIsDeployed: boolean = this.diagram.uri.startsWith('http');

    if (diagramIsDeployed || !diagramToNavigateTo) {
      this._router.navigateToRoute('start-page');
    } else {
      this._router.navigateToRoute('design', {
        diagramName: diagramToNavigateTo.name,
        diagramUri: diagramToNavigateTo.uri,
        solutionUri: activeSolution.uri,
        view: this._router.currentInstruction.params.view,
      });
    }
    this._openDiagramService.closeDiagram(this.diagram);

    this.diagram = undefined;
    this._solutionService = undefined;

    this.showModal = false;
  }
}
