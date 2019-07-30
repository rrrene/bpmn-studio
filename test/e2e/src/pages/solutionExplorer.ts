import {ElementFinder, ExpectedConditions, browser, by, element} from 'protractor';

import {By} from 'selenium-webdriver';

export class SolutionExplorer {
  private diagramIdIdentifier: string = 'diagramList-';
  private solutionExplorerPanelTag: string = 'solution-explorer-panel';

  public async show(): Promise<void> {
    await browser.wait(
      ExpectedConditions.visibilityOf(this.solutionExplorerPanelContainer),
      browser.params.defaultTimeoutMS,
    );
  }

  public async getVisbilityOfSolutionExplorer(): Promise<boolean> {
    return this.solutionExplorerPanelContainer.isDisplayed();
  }

  public async getVisibilityOfDiagramEntry(diagramName: string): Promise<boolean> {
    const diagramEntry: ElementFinder = this.getDiagramEntry(diagramName);
    await browser.wait(ExpectedConditions.visibilityOf(diagramEntry), browser.params.defaultTimeoutMS);

    return diagramEntry.isDisplayed();
  }

  public async openDiagramByClick(diagramName: string): Promise<void> {
    const diagramEntry: ElementFinder = this.getDiagramEntry(diagramName);
    await browser.wait(ExpectedConditions.visibilityOf(diagramEntry), browser.params.defaultTimeoutMS);

    return diagramEntry.click();
  }

  private get solutionExplorerPanelContainer(): ElementFinder {
    const panelContainerByTag: By = by.tagName(this.solutionExplorerPanelTag);

    return element(panelContainerByTag);
  }

  private getDiagramEntry(diagramName: string): ElementFinder {
    const diagramEntryById: string = this.diagramIdIdentifier + diagramName;
    const byId: By = by.id(diagramEntryById);

    return element(byId);
  }
}
