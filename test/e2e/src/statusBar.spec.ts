import {browser} from 'protractor';

import {SimpleDiagram} from './diagrams/simpleDiagram';
import {DiagramDetail} from './pages/diagramDetail';
import {RouterView} from './pages/routerView';
import {StatusBar} from './pages/statusBar';

describe('Status Bar', () => {
  let routerView: RouterView;
  let statusBar: StatusBar;
  let diagram: SimpleDiagram;
  let diagramDetail: DiagramDetail;

  const applicationUrl: string = browser.params.aureliaUrl;

  beforeAll(async () => {
    routerView = new RouterView();
    statusBar = new StatusBar();
    diagram = new SimpleDiagram();
    diagramDetail = new DiagramDetail(applicationUrl, diagram.name);

    await diagram.deployDiagram();

    await routerView.show();
    await statusBar.show();
  });

  afterAll(async () => {
    await diagram.deleteDiagram();
  });

  it('should contain left container.', async () => {
    const visibilityOfLeftContainer: boolean = await statusBar.getVisibilityOfLeftContainer();

    expect(visibilityOfLeftContainer).toBeTruthy();
  });

  it('should contain center container.', async () => {
    const visibilityOfCenterContainer: boolean = await statusBar.getVisibilityOfCenterContainer();

    expect(visibilityOfCenterContainer).toBeTruthy();
  });

  it('should contain right container.', async () => {
    const visibilityOfRightContainer: boolean = await statusBar.getVisibilityOfRightContainer();

    expect(visibilityOfRightContainer).toBeTruthy();
  });

  it('(on diagram detail) should show enable xml view button.', async () => {
    await routerView.show();
    await diagramDetail.show();
    await statusBar.show();

    const visibilityOfEnableXmlViewButton: boolean = await statusBar.getVisibilityOfEnableXmlViewButton();

    expect(visibilityOfEnableXmlViewButton).toBeTruthy();
  });

  it('should show  the `enable diff view` button on the `diagram detail view`.', async () => {
    const visibilityOfEnableDiffViewButton: boolean = await statusBar.getVisibilityOfEnableDiffViewButton();

    expect(visibilityOfEnableDiffViewButton).toBeTruthy();
  });

  it('should show the `disable xml view button` on the `diagram detail view`, after clicking on the `enable xml view` button.', async () => {
    await statusBar.clickOnEnableXmlViewButton();

    const visibilityOfDisableXmlViewButton: boolean = await statusBar.getVisibilityOfDisableXmlViewButton();

    expect(visibilityOfDisableXmlViewButton).toBeTruthy();
  });

  it('should show the `disable xml view` button on the `xml view`.', async () => {
    const visibilityOfDisableXmlViewButton: boolean = await statusBar.getVisibilityOfDisableXmlViewButton();

    expect(visibilityOfDisableXmlViewButton).toBeTruthy();
  });

  it('should show the `enable diff view` button on the `xml view`.', async () => {
    const visibilityOfEnableDiffViewButton: boolean = await statusBar.getVisibilityOfEnableDiffViewButton();

    expect(visibilityOfEnableDiffViewButton).toBeTruthy();
  });

  it('should show the `enable xml view` button on the `xml view`, after clicking on the `disable xml view` button', async () => {
    await statusBar.clickOnDisableXmlViewButton();

    const visibilityOfEnableXmlViewButton: boolean = await statusBar.getVisibilityOfEnableXmlViewButton();

    expect(visibilityOfEnableXmlViewButton).toBeTruthy();
  });

  it('should show the `disable diff view` button on the `diagram detail view`, after clicking on the `enable diff view` button.', async () => {
    await statusBar.clickOnEnableDiffViewButton();

    const visibilityOfDisableDiffViewButton: boolean = await statusBar.getVisibilityOfDisableDiffViewButton();

    expect(visibilityOfDisableDiffViewButton).toBeTruthy();
  });

  it('should `show disable diff view` button on `diff view`.', async () => {
    const visibilityOfDisableDiffViewButton: boolean = await statusBar.getVisibilityOfDisableDiffViewButton();

    expect(visibilityOfDisableDiffViewButton).toBeTruthy();
  });

  it('should show `enable xml view` button on the `diff view`.', async () => {
    const visibilityOfEnableXmlViewButton: boolean = await statusBar.getVisibilityOfEnableXmlViewButton();

    expect(visibilityOfEnableXmlViewButton).toBeTruthy();
  });

  it('should contain the `old vs new` button on the `diff view.`', async () => {
    const visibilityOfOldVsNewButton: boolean = await statusBar.getVisibilityOfOldVsNewButton();

    expect(visibilityOfOldVsNewButton).toBeTruthy();
  });

  it('should contain the `active new vs old` button on the `diff view`.', async () => {
    const visbilityOfNewVsOldButton: boolean = await statusBar.getVisibilityOfNewVsOldButton();

    expect(visbilityOfNewVsOldButton).toBeTruthy();

    const activeStateOfNewVsOldButton: boolean = await statusBar.getActiveStateOfNewVsOldButton();

    expect(activeStateOfNewVsOldButton).toBeTruthy();
  });

  it('should contain the changelog button on the `diff view`.', async () => {
    const visibilityOfChangeLogButton: boolean = await statusBar.getVisibilityOfChangeLogButton();

    expect(visibilityOfChangeLogButton).toBeTruthy();
  });

  it('should contain the `active old vs new button` on the `diff view`, after clicking on it.', async () => {
    await statusBar.clickOnOldVsNewButton();

    const activeStateOfOldVsNewButton: boolean = await statusBar.getActiveStateOfOldVsNewButton();

    expect(activeStateOfOldVsNewButton).toBeTruthy();
  });

  it('should contain the `inactive new vs old button` on the`diff view`, after clicking on the `old vs new` button.', async () => {
    await statusBar.clickOnOldVsNewButton();

    const activeStateOfNewVsOldButton: boolean = await statusBar.getActiveStateOfNewVsOldButton();

    expect(activeStateOfNewVsOldButton).toBeFalsy();
  });

  it('should contain the `active change log` button on the `diff view`, after clicking on it.', async () => {
    await statusBar.clickOnChangeLogButton();

    const activeStateOfChangeLogButton: boolean = await statusBar.getActiveStateOfChangeLogButton();

    expect(activeStateOfChangeLogButton).toBeTruthy();
  });
});
