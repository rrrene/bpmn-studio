import { browser, ElementFinder } from 'protractor';

import { SimpleDiagram } from './diagrams/simpleDiagram';
import { DiagramDetail } from './pages/diagramDetail';
import { DiffView } from './pages/diffView';
import { RouterView } from './pages/routerView';
import { StatusBar } from './pages/statusBar';

describe('Diff view', () => {
  let routerView: RouterView;
  let diagram1: SimpleDiagram;
  let diagram2: SimpleDiagram;
  let statusBar: StatusBar;
  let diagramDetail: DiagramDetail;
  let diffView: DiffView;

  const applicationUrl: string = browser.params.aureliaUrl;

  beforeAll(async () => {
    routerView = new RouterView();
    diagram1 = new SimpleDiagram();
    diagram2 = new SimpleDiagram();
    statusBar = new StatusBar();
    diagramDetail = new DiagramDetail(applicationUrl, diagram1.name);
    diffView = new DiffView(applicationUrl, diagram1.name);

    await diagram1.deployDiagram();
    await diagram2.deployDiagram();
  });

  afterAll(async () => {
    await diagram2.deleteDiagram();
    await diagram1.deleteDiagram();
  });

  it('should contain `Show Diff` button in status bar.', async () => {
    await routerView.show();
    await diagramDetail.show();

    const statusBarDiffViewButtonIsDisplayed: boolean = await statusBar.getVisibilityOfEnableDiffViewButton();

    expect(statusBarDiffViewButtonIsDisplayed).toBeTruthy();
  });

  it('should open the `diff view` when clicking on the `Show Diff` button.', async () => {
    await statusBar.clickOnEnableDiffViewButton();

    const currentBrowserUrl: string = await browser.getCurrentUrl();

    expect(currentBrowserUrl).toContain(diffView.urlWithoutQueryParams);

    const visibilityOfDiffViewContainer: boolean = await diffView.getVisibilityOfDiffViewContainer();

    expect(visibilityOfDiffViewContainer).toBeTruthy();
  });

  it('should contain `diffAgainstOtherDiagramButton` on right toolbar.', async () => {
    const diffAgainstOtherDiagramButtonIsDisplayed: boolean = await diffView.getVisibilityOfDiffAgainstOtherDiagramButton();

    expect(diffAgainstOtherDiagramButtonIsDisplayed).toBeTruthy();
  });

  it('should show `Choose diagram` modal.', async () => {
    diffView.clickOnDiffAgainstOtherDiagramButton();

    const chooseDiagramModalIsDisplayed: boolean = await diffView.getVisibilityOfChooseDiagramModal();

    expect(chooseDiagramModalIsDisplayed).toBeTruthy();
  });

  it('should contain `diagramDropdown` within the modal.', async () => {
    const diagramDropdownIsDisplayed: boolean = await diffView.getVisibilityOfDiagramDropdown();

    expect(diagramDropdownIsDisplayed).toBeTruthy();
  });

  it('should contain `cancelButton` within the modal.', async () => {
    const cancelButtonIsDisplayed: boolean = await diffView.getVisibilityOfCancelButton();

    expect(cancelButtonIsDisplayed).toBeTruthy();
  });

  it('should contain `compareButton` within the modal.', async () => {
    const compareButtonIsDisplayed: boolean = await diffView.getVisibilityOfCompareButton();

    expect(compareButtonIsDisplayed).toBeTruthy();
  });

  it('should cancel the modal.', async () => {
    const cancelButtonIsDisplayed: boolean = await diffView.getVisibilityOfCancelButton();
    expect(cancelButtonIsDisplayed).toBeTruthy();

    diffView.clickOnModalCancelButton();

    const chooseDiagramModalIsDisplayed: boolean = await diffView.getVisibilityOfChooseDiagramModal();
    expect(chooseDiagramModalIsDisplayed).toBeFalsy();
  });

  it('should select a diagram.', async () => {
    await routerView.show();
    await diffView.show();

    diffView.clickOnDiffAgainstOtherDiagramButton();

    const arrayOfOptions: Array<ElementFinder> = await diffView.getDropdownOptions();

    /**
     * The third option gets selected because the first two are always there.
     */
    // tslint:disable-next-line:no-magic-numbers
    expect(arrayOfOptions.length).toBeGreaterThan(2);
    // tslint:disable-next-line:no-magic-numbers
    await arrayOfOptions[2].click();
    // tslint:disable-next-line:no-magic-numbers
    expect(await arrayOfOptions[2].isSelected()).toBe(true);
  });

  it('should compare the current diagram with another.', async () => {
    await routerView.show();
    await diffView.show();

    diffView.clickOnDiffAgainstOtherDiagramButton();

    const arrayOfOptions: Array<ElementFinder> = await diffView.getDropdownOptions();

    // tslint:disable-next-line:no-magic-numbers
    await arrayOfOptions[2].click();
    diffView.clickOnModalCompareButton();

    const chooseDiagramModalIsDisplayed: boolean = await diffView.getVisibilityOfChooseDiagramModal();
    const diffIdentifierText: string = await diffView.getDiffIdentifierText();

    expect(chooseDiagramModalIsDisplayed).toBeFalsy();
    expect(diffIdentifierText).not.toBe('New vs. Old');
    expect(diffIdentifierText).toBe(`${diagram1.name} vs. ${diagram2.name}`);
  });
});
