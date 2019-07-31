import {EventAggregator} from 'aurelia-event-aggregator';
import {inject} from 'aurelia-framework';
import {Router} from 'aurelia-router';

import {ICallActivityElement, IShape} from '@process-engine/bpmn-elements_contracts';
import {IDiagram} from '@process-engine/solutionexplorer.contracts';

import {IPageModel, ISection} from '../../../../../../../contracts';
import environment from '../../../../../../../environment';
import {GeneralService} from '../../service/general.service';

@inject(GeneralService, Router, EventAggregator)
export class CallActivitySection implements ISection {
  public path: string = '/sections/call-activity/call-activity';
  public canHandleElement: boolean = false;
  public allDiagrams: Array<IDiagram>;
  public selectedDiagramId: string;

  private businessObjInPanel: ICallActivityElement;
  private generalService: GeneralService;
  private router: Router;
  private eventAggregator: EventAggregator;
  private activeSolutionUri: string;

  constructor(generalService?: GeneralService, router?: Router, eventAggregator?: EventAggregator) {
    this.generalService = generalService;
    this.router = router;
    this.eventAggregator = eventAggregator;
  }

  public async activate(model: IPageModel): Promise<void> {
    this.activeSolutionUri = this.router.currentInstruction.queryParams.solutionUri;
    this.businessObjInPanel = model.elementInPanel.businessObject;

    await this.getAllDiagrams();

    this.selectedDiagramId = this.businessObjInPanel.calledElement;
  }

  public isSuitableForElement(element: IShape): boolean {
    const elementIsCallActivity: boolean =
      element !== undefined &&
      element.businessObject !== undefined &&
      element.businessObject.$type === 'bpmn:CallActivity';

    return elementIsCallActivity;
  }

  public navigateToCalledDiagram(): void {
    this.router.navigateToRoute('design', {
      diagramName: this.selectedDiagramId,
      solutionUri: this.activeSolutionUri,
      view: 'detail',
    });
  }

  public updateCalledDiagram(): void {
    this.businessObjInPanel.calledElement = this.selectedDiagramId;

    this.publishDiagramChange();
  }

  private async getAllDiagrams(): Promise<void> {
    const allDiagramsInSolution: Array<IDiagram> = await this.generalService.getAllDiagrams();

    const currentDiagramName: string = this.router.currentInstruction.params.diagramName;
    const allDiagramWithoutCurrentOne: Array<IDiagram> = allDiagramsInSolution.filter((diagram: IDiagram) => {
      return diagram.name !== currentDiagramName;
    });

    this.allDiagrams = allDiagramWithoutCurrentOne;
  }

  private publishDiagramChange(): void {
    this.eventAggregator.publish(environment.events.diagramChange);
  }
}
