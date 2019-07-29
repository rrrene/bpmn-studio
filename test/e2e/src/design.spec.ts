import {browser} from 'protractor';

import {SimpleDiagram} from './diagrams/simpleDiagram';
import {DiagramDetail} from './pages/diagramDetail';
import {DiffView} from './pages/diffView';
import {RouterView} from './pages/routerView';
import {StatusBar} from './pages/statusBar';
import {XmlView} from './pages/xmlView';

describe('Design view', () => {
  let routerView: RouterView;
  let diagram: SimpleDiagram;
  let statusBar: StatusBar;
  let diagramDetail: DiagramDetail;
  let xmlView: XmlView;
  let diffView: DiffView;

  const applicationUrl: string = browser.params.aureliaUrl;

  beforeAll(async () => {
    routerView = new RouterView();
    diagram = new SimpleDiagram();
    statusBar = new StatusBar();
    diagramDetail = new DiagramDetail(applicationUrl, diagram.name);
    xmlView = new XmlView(applicationUrl, diagram.name);
    diffView = new DiffView(applicationUrl, diagram.name);

    await diagram.deployDiagram();
  });

  afterAll(async () => {
    await diagram.deleteDiagram();
  });

  it('should show the `detail view` after navigating to it.', async () => {
    await routerView.show();
    await diagramDetail.show();

    const visibilityOfDiagramDetailContainer: boolean = await diagramDetail.getVisibilityOfDiagramDetailContainer();

    expect(visibilityOfDiagramDetailContainer).toBeTruthy();
  });

  it('should show the `xml view` after navigating to it.', async () => {
    await routerView.show();
    await xmlView.show();

    const visibilityOfXmlViewContainer: boolean = await xmlView.getVisibilityOfXmlViewContainer();

    expect(visibilityOfXmlViewContainer).toBeTruthy();
  });

  it('should show the `diff view` after navigating to it.', async () => {
    await routerView.show();
    await diffView.show();

    const visibilityOfDiffViewContainer: boolean = await diffView.getVisibilityOfDiffViewContainer();

    expect(visibilityOfDiffViewContainer).toBeTruthy();
  });

  it('should show the `xml view` after clicking on the button in the status bar.', async () => {
    await routerView.show();
    await diagramDetail.show();
    await statusBar.show();

    await statusBar.clickOnEnableXmlViewButton();

    const visibilityOfXmlViewContainer: boolean = await xmlView.getVisibilityOfXmlViewContainer();

    expect(visibilityOfXmlViewContainer).toBeTruthy();
  });

  it('should switch from `xml view` to `detail view`, after clicking on the button in the status bar.', async () => {
    await statusBar.clickOnDisableXmlViewButton();

    const visibilityOfDiagramDetailContainer: boolean = await diagramDetail.getVisibilityOfDiagramDetailContainer();

    expect(visibilityOfDiagramDetailContainer).toBeTruthy();
  });

  it('should show `diff view` after clicking on the button in the status bar.', async () => {
    await statusBar.clickOnEnableDiffViewButton();

    const visibilityOfDiffViewContainer: boolean = await diffView.getVisibilityOfDiffViewContainer();

    expect(visibilityOfDiffViewContainer).toBeTruthy();
  });

  it('should switch from `diff view` to `detail view` after clicking on the button in the status bar.', async () => {
    await statusBar.clickOnDisableDiffViewButton();

    const visibilityOfDiagramDetailContainer: boolean = await diagramDetail.getVisibilityOfDiagramDetailContainer();

    expect(visibilityOfDiagramDetailContainer).toBeTruthy();
  });
});
