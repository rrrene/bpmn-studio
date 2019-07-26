import { browser } from 'protractor';

import { SimpleDiagram } from './diagrams/simpleDiagram';
import { DiagramDetail } from './pages/diagramDetail';
import { DiagramList } from './pages/diagramList';
import { RouterView } from './pages/routerView';

describe('Diagram List', () => {
  let diagramList: DiagramList;
  let routerView: RouterView;
  let diagram: SimpleDiagram;
  let diagramDetail: DiagramDetail;

  const applicationUrl: string = browser.params.aureliaUrl;

  beforeAll(async () => {
    diagram = new SimpleDiagram();
    diagramList = new DiagramList(applicationUrl);
    routerView = new RouterView();
    diagramDetail = new DiagramDetail(applicationUrl, diagram.name);

    await diagram.deployDiagram();

    await routerView.show();
    await diagramList.show();
  });

  afterAll(async () => {
    await diagram.deleteDiagram();
  });

  it('should contain the deployed diagram.', async () => {
    const visibilityOfDiagramListEntry: boolean = await diagramList.getVisibilityOfDiagramListEntry(diagram.name);

    expect(visibilityOfDiagramListEntry).toBeTruthy();
  });

  // it('should navigate to `detail view` after clicking on the link in the table.', async() => {
  //   diagramList.clickOnDiagramListEntry(diagram.name);

  //   const currentBrowserUrl: string = await browser.getCurrentUrl();

  //   expect(currentBrowserUrl).toContain(diagramDetail.url);

  //   const visibilityOfDiagramDetailContainer: boolean = await diagramDetail.getVisibilityOfDiagramDetailContainer();

  //   expect(visibilityOfDiagramDetailContainer).toBeTruthy();
  // });
});
