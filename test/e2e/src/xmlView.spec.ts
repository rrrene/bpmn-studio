import {browser} from 'protractor';

import {SimpleDiagram} from './diagrams/simpleDiagram';
import {DiagramDetail} from './pages/diagramDetail';
import {RouterView} from './pages/routerView';
import {StatusBar} from './pages/statusBar';
import {XmlView} from './pages/xmlView';

describe('XML view', () => {

  let routerView: RouterView;
  let diagram: SimpleDiagram;
  let statusBar: StatusBar;
  let diagramDetail: DiagramDetail;
  let xmlView: XmlView;

  const applicationUrl: string = browser.params.aureliaUrl;

  beforeAll(async() => {
    routerView = new RouterView();
    diagram = new SimpleDiagram();
    statusBar = new StatusBar();
    diagramDetail = new DiagramDetail(applicationUrl, diagram.name);
    xmlView = new XmlView(applicationUrl, diagram.name);

    await diagram.deployDiagram();
  });

  afterAll(async() => {

    await diagram.deleteDiagram();
  });

  beforeEach(async() => {
    await routerView.show();
    await diagramDetail.show();
  });

  it('should contain `Show XML` button in status bar.', async() => {
    const statusBarXMLViewButtonIsDisplayed: boolean = await statusBar.getVisibilityOfEnableXmlViewButton();

    expect(statusBarXMLViewButtonIsDisplayed).toBeTruthy();
  });

  it('should open the `xml view`, when clicking on the `Show XML` button.', async() => {
    await statusBar.clickOnEnableXmlViewButton();

    const currentBrowserUrl: string = await browser.getCurrentUrl();

    expect(currentBrowserUrl).toContain(xmlView.urlWithoutQueryParams);

    const visibilityOfXmlViewContainer: boolean = await xmlView.getVisibilityOfXmlViewContainer();

    expect(visibilityOfXmlViewContainer).toBeTruthy();
  });

  it('should show the XML code block.', async() => {
    await xmlView.show();

    const visbilityOfXMLCodeBlock: boolean = await xmlView.getVisbilityOfXMLCodeBlock();

    expect(visbilityOfXMLCodeBlock).toBeTruthy();
  });

  it('should show line numbers.', async() => {

    const visbilityOfLineNumbers: boolean = await xmlView.getVisbilityOfLineNumbers();

    expect(visbilityOfLineNumbers).toBeTruthy();
  });

  it('should show code lines.', async() => {

    const visiblityOfCodeLines: boolean = await xmlView.getVisbilityOfCodeLines();

    expect(visiblityOfCodeLines).toBeTruthy();
  });

});
