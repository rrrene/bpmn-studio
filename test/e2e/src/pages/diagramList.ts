import {ElementFinder, ExpectedConditions, browser, by, element} from 'protractor';

import {By} from 'selenium-webdriver';

export class DiagramList {
  public url: string;

  private _diagramListContainerTag: string = 'diagram-list';
  private _diagramListEntryIndentifier: string = 'diagram-';

  constructor(applicationUrl: string) {
    this.url = `${applicationUrl}/think`;
  }

  public async show(): Promise<void> {
    await browser.get(this.url);

    await browser.wait(ExpectedConditions.visibilityOf(this._diagramListContainer), browser.params.defaultTimeoutMS);
  }

  public async getVisibilityOfDiagramListEntry(diagramName: string): Promise<boolean> {
    const diagramListEntry: ElementFinder = this._getDiagramListEntry(diagramName);

    return diagramListEntry.isDisplayed();
  }

  public async clickOnDiagramListEntry(diagramName: string): Promise<void> {
    const diagramListEntry: ElementFinder = this._getDiagramListEntry(diagramName);

    return diagramListEntry.click();
  }

  private get _diagramListContainer(): ElementFinder {
    const diagramDetailContainerById: By = by.tagName(this._diagramListContainerTag);

    return element(diagramDetailContainerById);
  }

  private _getDiagramListEntry(diagramName: string): ElementFinder {
    const diagramListEntryId: string = `${this._diagramListEntryIndentifier}${diagramName}`;
    const diagramListEntryById: By = by.id(diagramListEntryId);

    return element(diagramListEntryById);
  }
}
