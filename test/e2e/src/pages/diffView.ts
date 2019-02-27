import {browser, by, element, ElementArrayFinder, ElementFinder, ExpectedConditions} from 'protractor';

import {By} from 'selenium-webdriver';

const diffAgainstOtherDiagramButtonId: string = 'js-diff-against-other-diagramButton';
const diffViewContainerId: string = 'js-diagram-diffContainer';
const chooseDiagramModalId: string = 'js-chooseDiagram-modal';
const diagramDropdownId: string = 'js-diagram-dropdown';

export class DiffView {

  public url: string;

  constructor(applicationUrl: string, diagramName: string) {
    this.url = `${applicationUrl}/design/diff/diagram/${diagramName}?solutionUri=http%3A%2F%2Flocalhost%3A8000`;
  }

  public async show(): Promise<void> {
    await browser.get(this.url);

    await browser.wait(ExpectedConditions.visibilityOf(this._diffViewContainer), browser.params.defaultTimeoutMS);
  }

  public async getVisibilityOfDiffViewContainer(): Promise<boolean> {
    await browser.wait(ExpectedConditions.visibilityOf(this._diffViewContainer), browser.params.defaultTimeoutMS);

    return this._diffViewContainer.isDisplayed();
  }

  public async getVisibilityOfDiffAgainstOtherDiagramButton(): Promise<boolean> {
    await browser.wait(ExpectedConditions.visibilityOf(this._diffAgainstOtherDiagramButton), browser.params.defaultTimeoutMS);

    return this._diffAgainstOtherDiagramButton.isDisplayed();
  }

  public clickOnDiffAgainstOtherDiagramButton(): void {
    this._diffAgainstOtherDiagramButton.click();
  }

  public async getVisibilityOfChooseDiagramModal(): Promise<boolean> {
    await browser.wait(ExpectedConditions.visibilityOf(this._chooseDiagramModal), browser.params.defaultTimeoutMS);

    return this._chooseDiagramModal.isDisplayed();
  }

  public async getVisibilityOfDiagramDropdown(): Promise<boolean> {
    await browser.wait(ExpectedConditions.visibilityOf(this._diagramDropdown), browser.params.defaultTimeoutMS);

    return this._diagramDropdown.isDisplayed();
  }

  public async getDropdownOptions(): Promise<Array<ElementFinder>> {
    await browser.wait(ExpectedConditions.visibilityOf(this._diagramDropdown), browser.params.defaultTimeoutMS);
    await this._diagramDropdown.click();

    const elements: ElementArrayFinder = this._diagramDropdown.all(by.tagName('option'));
    const options: Array<ElementFinder> = [];

    await elements.each((elementFinder: ElementFinder) => {
      options.push(elementFinder);
    });

    return options;
  }

  private get _diffViewContainer(): ElementFinder {
    const diffViewContainerById: By = by.id(diffViewContainerId);

    return element(diffViewContainerById);
  }

  private get _diffAgainstOtherDiagramButton(): ElementFinder {
    const diffAgainstOtherDiagramButtonById: By = by.id(diffAgainstOtherDiagramButtonId);

    return element(diffAgainstOtherDiagramButtonById);
  }

  private get _chooseDiagramModal(): ElementFinder {
    const chooseDiagramModalById: By = by.id(chooseDiagramModalId);

    return element(chooseDiagramModalById);
  }

  private get _diagramDropdown(): ElementFinder {
    const diagramDropdownById: By = by.id(diagramDropdownId);

    return element(diagramDropdownById);
  }
}
