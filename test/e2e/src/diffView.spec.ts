import {browser} from 'protractor';

import {Design} from '../../../src/modules/design/design';
import {SimpleDiagram} from './diagrams/simpleDiagram';
import {DiagramDetail} from './pages/diagramDetail';
import {DiffView} from './pages/diffView';
import {RouterView} from './pages/routerView';
import {StatusBar} from './pages/statusBar';

describe('Diff view', () => {

  let routerView: RouterView;
  let diagram: SimpleDiagram;
  let statusBar: StatusBar;
  let diagramDetail: DiagramDetail;
  let diffView: DiffView;

  const applicationUrl: string = browser.params.aureliaUrl;

  beforeAll(async() => {
    routerView = new RouterView();
    diagram = new SimpleDiagram();
    statusBar = new StatusBar();
    diagramDetail = new DiagramDetail(applicationUrl, diagram.name);
    diffView = new DiffView(applicationUrl, diagram.name);

    await diagram.deployDiagram();
  });

  afterAll(async() => {

    await diagram.deleteDiagram();
  });

  beforeEach(async() => {
    await routerView.show();
    await diagramDetail.show();
  });

  it('should contain `Show Diff` button in status bar.', async() => {
    const statusBarDiffViewButtonIsDisplayed: boolean = await statusBar.getVisibilityOfEnableDiffViewButton();

    expect(statusBarDiffViewButtonIsDisplayed).toBeTruthy();
  });

  it('should open the `diff view` when clicking on the `Show Diff` button.', async() => {
    await statusBar.clickOnEnableDiffViewButton();

    const currentBrowserUrl: string = await browser.getCurrentUrl();

    expect(currentBrowserUrl).toContain(diffView.url);

    const visibilityOfDiffViewContainer: boolean = await diffView.getVisibilityOfDiffViewContainer();

    expect(visibilityOfDiffViewContainer).toBeTruthy();
  });

  it('should contain `diffAgainstOtherDiagramButton` on right toolbar.', async() => {
    await diffView.show();
    const diffAgainstOtherDiagramButtonIsDisplayed: boolean = await diffView.getVisibilityOfDiffAgainstOtherDiagramButton();

    expect(diffAgainstOtherDiagramButtonIsDisplayed).toBeTruthy();
  });

  it('should show `Choose diagram` modal.', async() => {
    await diffView.show();
    diffView.clickOnDiffAgainstOtherDiagramButton();

    const chooseDiagramModalIsDisplayed: boolean = await diffView.getVisibilityOfChooseDiagramModal();

    expect(chooseDiagramModalIsDisplayed).toBeTruthy();
  });

});
