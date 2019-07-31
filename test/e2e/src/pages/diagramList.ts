import {ElementFinder, ExpectedConditions, browser, by, element} from 'protractor';

import {By} from 'selenium-webdriver';

export class DiagramList {
  public url: string;

  private diagramListContainerTag: string = 'diagram-list';
  private diagramListEntryIndentifier: string = 'diagram-';

  constructor(applicationUrl: string) {
    this.url = `${applicationUrl}/think`;
  }

  public async show(): Promise<void> {
    await browser.get(this.url);

    await browser.wait(ExpectedConditions.visibilityOf(this.diagramListContainer), browser.params.defaultTimeoutMS);
  }

  public async getVisibilityOfDiagramListEntry(diagramName: string): Promise<boolean> {
    const diagramListEntry: ElementFinder = this.getDiagramListEntry(diagramName);

    return diagramListEntry.isDisplayed();
  }

  public async clickOnDiagramListEntry(diagramName: string): Promise<void> {
    const diagramListEntry: ElementFinder = this.getDiagramListEntry(diagramName);

    return diagramListEntry.click();
  }

  private get diagramListContainer(): ElementFinder {
    const diagramDetailContainerById: By = by.tagName(this.diagramListContainerTag);

    return element(diagramDetailContainerById);
  }

  private getDiagramListEntry(diagramName: string): ElementFinder {
    const diagramListEntryId: string = `${this.diagramListEntryIndentifier}${diagramName}`;
    const diagramListEntryById: By = by.id(diagramListEntryId);

    return element(diagramListEntryById);
  }
}
