import {browser, by, element, ElementArrayFinder, ElementFinder, ExpectedConditions} from 'protractor';

import {By} from 'selenium-webdriver';

const diffAgainstOtherDiagramButtonId: string = 'js-diff-against-other-diagramButton';
const diffViewContainerId: string = 'js-diagram-diffContainer';
const chooseDiagramModalId: string = 'js-chooseDiagram-modal';
const diagramDropdownId: string = 'js-diagram-dropdown';
const compareButtonId: string = 'js-choose-diagram';
const cancelButtonId: string = 'js-cancel-diagram-selection';
const diffIdentifierId: string = 'js-diff-identifier';

export class DiffView {

  public url: string;
  public urlWithoutQueryParams: string;

  constructor(applicationUrl: string, diagramName: string) {
    this.url = `${applicationUrl}/design/diff/diagram/${diagramName}?solutionUri=http%3A%2F%2Flocalhost%3A8000`;
    this.urlWithoutQueryParams = `${applicationUrl}/design/diff/diagram/${diagramName}`;
  }

  public async show(): Promise<void> {
    await browser.get(this.url);

    await browser.wait(ExpectedConditions.visibilityOf(this._diffViewContainer), browser.params.defaultTimeoutMS);
  }

  public async getVisibilityOfDiffViewContainer(): Promise<boolean> {
    await this._waitForVisbilityOfElement(this._diffViewContainer);

    return this._diffViewContainer.isDisplayed();
  }

  public async getVisibilityOfDiffAgainstOtherDiagramButton(): Promise<boolean> {
    await this._waitForVisbilityOfElement(this._diffAgainstOtherDiagramButton);

    return this._diffAgainstOtherDiagramButton.isDisplayed();
  }

  public clickOnDiffAgainstOtherDiagramButton(): void {
    this._diffAgainstOtherDiagramButton.click();
  }

  public clickOnModalCancelButton(): void {
    this._cancelButton.click();
  }

  public clickOnModalCompareButton(): void {
    this._compareButton.click();
  }

  public async getDiffIdentifierText(): Promise<string> {
    await this._waitForVisbilityOfElement(this._diffIdentifier);
    const identifierString: string = await this._diffIdentifier.getText();

    return identifierString;
  }

  public async getVisibilityOfChooseDiagramModal(): Promise<boolean> {
    await this._waitForVisbilityOfElement(this._chooseDiagramModal);

    return this._chooseDiagramModal.isDisplayed();
  }

  public async getVisibilityOfDiagramDropdown(): Promise<boolean> {
    await this._waitForVisbilityOfElement(this._diagramDropdown);

    return this._diagramDropdown.isDisplayed();
  }

  public async getVisibilityOfCompareButton(): Promise<boolean> {
    await this._waitForVisbilityOfElement(this._compareButton);

    return this._compareButton.isDisplayed();
  }

  public async getVisibilityOfCancelButton(): Promise<boolean> {
    await this._waitForVisbilityOfElement(this._cancelButton);

    return this._cancelButton.isDisplayed();
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

  private get _cancelButton(): ElementFinder {
    const cancelButtonById: By = by.id(cancelButtonId);

    return element(cancelButtonById);
  }

  private get _compareButton(): ElementFinder {
    const compareButtonById: By = by.id(compareButtonId);

    return element(compareButtonById);
  }

  private get _diffIdentifier(): ElementFinder {
    const diffIdentifierById: By = by.id(diffIdentifierId);

    return element(diffIdentifierById);
  }

  private async _waitForVisbilityOfElement(finder: ElementFinder): Promise<void> {
    const finderVisibility: Function = ExpectedConditions.visibilityOf(finder);

    await browser.wait(finderVisibility, browser.params.defaultTimeoutMS).catch(() => {
      // If this timeouts do nothing.
      // We are basically supressing the timeout error here.
      // This way we get better error messages for debugging by the actual test function.
    });
  }
}
