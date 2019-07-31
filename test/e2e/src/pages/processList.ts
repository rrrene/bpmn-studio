import {ElementFinder, ExpectedConditions, browser, by, element} from 'protractor';

import {By} from 'selenium-webdriver';

export class ProcessList {
  public url: string;

  private listEntryIdentifier: string = 'processList-';
  private processListContainerId: string = 'processListContainer';
  private diagramLinkClassName: string = 'process-list-item-modelname';
  private userTaskLinkClassName: string = 'process-list-item-user-tasks';

  constructor(applicationUrl: string) {
    this.url = `${applicationUrl}/process`;
  }

  public async show(): Promise<void> {
    await browser.get(this.url);

    await browser.wait(ExpectedConditions.visibilityOf(this.processListContainer), browser.params.defaultTimeoutMS);
  }

  public async getVisibilityOfProcessListContainer(): Promise<boolean> {
    return this.processListContainer.isDisplayed();
  }

  public async getVisibilityOfListEntry(correlationId: string): Promise<boolean> {
    const listEntry: ElementFinder = this.getListEntry(correlationId);
    await browser.wait(ExpectedConditions.visibilityOf(listEntry), browser.params.defaultTimeoutMS);

    return listEntry.isDisplayed();
  }

  public async getVisbilityOfDiagramDesignLink(correlationId: string): Promise<boolean> {
    const diagramDesignLink: ElementFinder = this.getDiagramDesignLink(correlationId);
    await browser.wait(ExpectedConditions.visibilityOf(diagramDesignLink), browser.params.defaultTimeoutMS);

    return diagramDesignLink.isDisplayed();
  }

  public async clickOnDiagramDesignLink(correlationId: string): Promise<void> {
    const diagramDesignLink: ElementFinder = this.getDiagramDesignLink(correlationId);
    await browser.wait(ExpectedConditions.visibilityOf(diagramDesignLink), browser.params.defaultTimeoutMS);

    return diagramDesignLink.click();
  }

  public async getVisbilityOfUserTaskLink(correlationId: string): Promise<boolean> {
    const userTaskLink: ElementFinder = this.getUserTaskLink(correlationId);
    await browser.wait(ExpectedConditions.visibilityOf(userTaskLink), browser.params.defaultTimeoutMS);

    return userTaskLink.isDisplayed();
  }

  public async clickOnUserTaskLink(correlationId: string): Promise<void> {
    const userTaskLink: ElementFinder = this.getUserTaskLink(correlationId);
    await browser.wait(ExpectedConditions.visibilityOf(userTaskLink), browser.params.defaultTimeoutMS);

    return userTaskLink.click();
  }

  private get processListContainer(): ElementFinder {
    const processListContainerbyId: By = by.id(this.processListContainerId);

    return element(processListContainerbyId);
  }

  private getListEntry(correlationId: string): ElementFinder {
    const listEntryId: string = `${this.listEntryIdentifier}${correlationId}`;
    const listEntryById: By = by.id(listEntryId);

    return element(listEntryById);
  }

  private getDiagramDesignLink(correlationId: string): ElementFinder {
    const listEntryId: string = `${this.listEntryIdentifier}${correlationId}`;
    const listEntryById: By = by.id(listEntryId);
    const diagramLinkByTag: By = by.className(this.diagramLinkClassName);

    return element(listEntryById)
      .all(diagramLinkByTag)
      .first();
  }

  private getUserTaskLink(correlationId: string): ElementFinder {
    const listEntryId: string = `${this.listEntryIdentifier}${correlationId}`;
    const listEntryById: By = by.id(listEntryId);
    const diagramLinkByTag: By = by.className(this.userTaskLinkClassName);

    return element(listEntryById)
      .all(diagramLinkByTag)
      .first();
  }
}
