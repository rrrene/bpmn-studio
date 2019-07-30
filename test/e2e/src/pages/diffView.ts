import {ElementArrayFinder, ElementFinder, ExpectedConditions, browser, by, element} from 'protractor';

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

    await browser.wait(ExpectedConditions.visibilityOf(this.diffViewContainer), browser.params.defaultTimeoutMS);
  }

  public async getVisibilityOfDiffViewContainer(): Promise<boolean> {
    await this.waitForVisbilityOfElement(this.diffViewContainer);

    return this.diffViewContainer.isDisplayed();
  }

  public async getVisibilityOfDiffAgainstOtherDiagramButton(): Promise<boolean> {
    await this.waitForVisbilityOfElement(this.diffAgainstOtherDiagramButton);

    return this.diffAgainstOtherDiagramButton.isDisplayed();
  }

  public clickOnDiffAgainstOtherDiagramButton(): void {
    this.diffAgainstOtherDiagramButton.click();
  }

  public clickOnModalCancelButton(): void {
    this.cancelButton.click();
  }

  public clickOnModalCompareButton(): void {
    this.compareButton.click();
  }

  public async getDiffIdentifierText(): Promise<string> {
    await this.waitForVisbilityOfElement(this.diffIdentifier);
    const identifierString: string = await this.diffIdentifier.getText();

    return identifierString;
  }

  public async getVisibilityOfChooseDiagramModal(): Promise<boolean> {
    await this.waitForVisbilityOfElement(this.chooseDiagramModal);

    return this.chooseDiagramModal.isDisplayed();
  }

  public async getVisibilityOfDiagramDropdown(): Promise<boolean> {
    await this.waitForVisbilityOfElement(this.diagramDropdown);

    return this.diagramDropdown.isDisplayed();
  }

  public async getVisibilityOfCompareButton(): Promise<boolean> {
    await this.waitForVisbilityOfElement(this.compareButton);

    return this.compareButton.isDisplayed();
  }

  public async getVisibilityOfCancelButton(): Promise<boolean> {
    await this.waitForVisbilityOfElement(this.cancelButton);

    return this.cancelButton.isDisplayed();
  }

  public async getDropdownOptions(): Promise<Array<ElementFinder>> {
    await browser.wait(ExpectedConditions.visibilityOf(this.diagramDropdown), browser.params.defaultTimeoutMS);
    await this.diagramDropdown.click();

    const elements: ElementArrayFinder = this.diagramDropdown.all(by.tagName('option'));
    const options: Array<ElementFinder> = [];

    await elements.each((elementFinder: ElementFinder) => {
      options.push(elementFinder);
    });

    return options;
  }

  private get diffViewContainer(): ElementFinder {
    const diffViewContainerById: By = by.id(diffViewContainerId);

    return element(diffViewContainerById);
  }

  private get diffAgainstOtherDiagramButton(): ElementFinder {
    const diffAgainstOtherDiagramButtonById: By = by.id(diffAgainstOtherDiagramButtonId);

    return element(diffAgainstOtherDiagramButtonById);
  }

  private get chooseDiagramModal(): ElementFinder {
    const chooseDiagramModalById: By = by.id(chooseDiagramModalId);

    return element(chooseDiagramModalById);
  }

  private get diagramDropdown(): ElementFinder {
    const diagramDropdownById: By = by.id(diagramDropdownId);

    return element(diagramDropdownById);
  }

  private get cancelButton(): ElementFinder {
    const cancelButtonById: By = by.id(cancelButtonId);

    return element(cancelButtonById);
  }

  private get compareButton(): ElementFinder {
    const compareButtonById: By = by.id(compareButtonId);

    return element(compareButtonById);
  }

  private get diffIdentifier(): ElementFinder {
    const diffIdentifierById: By = by.id(diffIdentifierId);

    return element(diffIdentifierById);
  }

  private async waitForVisbilityOfElement(finder: ElementFinder): Promise<void> {
    const finderVisibility: Function = ExpectedConditions.visibilityOf(finder);

    await browser.wait(finderVisibility, browser.params.defaultTimeoutMS).catch(() => {
      // If this timeouts do nothing.
      // We are basically supressing the timeout error here.
      // This way we get better error messages for debugging by the actual test function.
    });
  }
}
