import {inject} from 'aurelia-framework';
import {Router} from 'aurelia-router';

import {IDiagram, ISolution} from '@process-engine/solutionexplorer.contracts';

import {ISolutionEntry, ISolutionService} from '../../../../../../contracts';

@inject('SolutionService', Router)
export class GeneralRepository {
  private solutionService: ISolutionService;
  private router: Router;

  constructor(solutionService: ISolutionService, router: Router) {
    this.solutionService = solutionService;
    this.router = router;
  }

  public async getAllDiagrams(): Promise<Array<IDiagram>> {
    const currentSolutionUri: string = this.router.currentInstruction.queryParams.solutionUri;

    const solutionEntry: ISolutionEntry = await this.solutionService.getSolutionEntryForUri(currentSolutionUri);
    const solution: ISolution = await solutionEntry.service.loadSolution();

    const allDiagramsInSolution: Array<IDiagram> = solution.diagrams;

    return allDiagramsInSolution;
  }
}
