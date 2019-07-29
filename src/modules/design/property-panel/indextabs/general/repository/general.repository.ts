import {inject} from 'aurelia-framework';
import {Router} from 'aurelia-router';

import {IDiagram, ISolution} from '@process-engine/solutionexplorer.contracts';

import {ISolutionEntry, ISolutionService} from '../../../../../../contracts';

@inject('SolutionService', Router)
export class GeneralRepository {
  private _solutionService: ISolutionService;
  private _router: Router;

  constructor(solutionService: ISolutionService, router: Router) {
    this._solutionService = solutionService;
    this._router = router;
  }

  public async getAllDiagrams(): Promise<Array<IDiagram>> {
    const currentSolutionUri: string = this._router.currentInstruction.queryParams.solutionUri;

    const solutionEntry: ISolutionEntry = await this._solutionService.getSolutionEntryForUri(currentSolutionUri);
    const solution: ISolution = await solutionEntry.service.loadSolution();

    const allDiagramsInSolution: Array<IDiagram> = solution.diagrams;

    return allDiagramsInSolution;
  }
}
