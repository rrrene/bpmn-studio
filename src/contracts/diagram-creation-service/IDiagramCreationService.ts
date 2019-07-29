import {IDiagram} from '@process-engine/solutionexplorer.contracts';

export interface IDiagramCreationService {
  createNewDiagram(solutionBaseUri: string, withName: string, xml?: string): Promise<IDiagram>;
}
