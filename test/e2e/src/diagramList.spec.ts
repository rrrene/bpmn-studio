import {
  browser,
  ElementFinder,
  protractor,
  ProtractorExpectedConditions,
} from 'protractor';

import {SimpleDiagram} from './diagrams/simpleDiagram';
import {DiagramDetail} from './pages/diagramDetail';
import {DiagramList} from './pages/diagramList';
import {RouterView} from './pages/routerView';

describe('Diagram List', () => {

  let diagramList: DiagramList;
  let routerView: RouterView;
  let diagram: SimpleDiagram;
  let diagramDetail: DiagramDetail;

  const applicationUrl: string = browser.params.aureliaUrl;

  beforeAll(async() => {

    diagram = new SimpleDiagram();
    diagramList = new DiagramList(applicationUrl);
    routerView = new RouterView();
    diagramDetail = new DiagramDetail(applicationUrl, diagram.name);

    await diagram.deployDiagram();
  });

  afterAll(async() => {
    await diagram.deleteDiagram();
  });

  beforeEach(async() => {
    await routerView.init();
    await diagramList.init();
  });

  it('should contain the deployed diagram.', async() => {
    const visibilityOfDiagramListEntry: boolean = await diagramList.getVisibilityOfDiagramListEntry(diagram.name);

    expect(visibilityOfDiagramListEntry).toBeTruthy();
  });

  it('should navigate to design on click on link in table.', async() => {
    diagramList.clickOnDiagramListEntry(diagram.name);

    const currentBrowserUrl: string = await browser.getCurrentUrl();
    expect(currentBrowserUrl).toContain(diagramDetail.url);
  });
});
