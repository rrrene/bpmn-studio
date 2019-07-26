import { browser } from 'protractor';

import { SimpleDiagram } from './diagrams/simpleDiagram';
import { DiagramDetail } from './pages/diagramDetail';
import { RouterView } from './pages/routerView';
import { SolutionExplorer } from './pages/solutionExplorer';

describe('Solution Explorer', () => {
  let solutionExplorer: SolutionExplorer;
  let diagram: SimpleDiagram;
  let routerView: RouterView;
  let diagramDetail: DiagramDetail;

  const applicationUrl: string = browser.params.aureliaUrl;

  beforeAll(async () => {
    solutionExplorer = new SolutionExplorer();
    diagram = new SimpleDiagram();
    routerView = new RouterView();
    diagramDetail = new DiagramDetail(applicationUrl, diagram.name);

    await diagram.deployDiagram();
  });

  afterAll(async () => {
    await diagram.deleteDiagram();
  });

  beforeEach(async () => {
    await routerView.show();
    await solutionExplorer.show();
  });

  it('should display the deployed diagram.', async () => {
    const diagramIsVisible: boolean = await solutionExplorer.getVisibilityOfDiagramEntry(diagram.name);

    expect(diagramIsVisible).toBeTruthy();
  });

  it('should navigate to the `detail view`, after clicking on the diagram name.', async () => {
    await solutionExplorer.openDiagramByClick(diagram.name);

    const currentBrowserUrl: string = await browser.getCurrentUrl();

    expect(currentBrowserUrl).toContain(diagram.name);

    const visibilityOfDiagramDetailContainer: boolean = await diagramDetail.getVisibilityOfDiagramDetailContainer();

    expect(visibilityOfDiagramDetailContainer).toBeTruthy();
  });
});
