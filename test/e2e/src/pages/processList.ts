import { browser, by, element, ElementFinder, ExpectedConditions } from 'protractor';

import { By } from 'selenium-webdriver';

export class ProcessList {
  public url: string;

  private _listEntryIdentifier: string = 'processList-';
  private _processListContainerId: string = 'processListContainer';
  private _diagramLinkClassName: string = 'process-list-item-modelname';
  private _userTaskLinkClassName: string = 'process-list-item-user-tasks';

  constructor(applicationUrl: string) {
    this.url = `${applicationUrl}/process`;
  }

  public async show(): Promise<void> {
    await browser.get(this.url);

    await browser.wait(ExpectedConditions.visibilityOf(this._processListContainer), browser.params.defaultTimeoutMS);
  }

  public async getVisibilityOfProcessListContainer(): Promise<boolean> {
    return this._processListContainer.isDisplayed();
  }

  public async getVisibilityOfListEntry(correlationId: string): Promise<boolean> {
    const listEntry: ElementFinder = this._getListEntry(correlationId);
    await browser.wait(ExpectedConditions.visibilityOf(listEntry), browser.params.defaultTimeoutMS);

    return listEntry.isDisplayed();
  }

  public async getVisbilityOfDiagramDesignLink(correlationId: string): Promise<boolean> {
    const diagramDesignLink: ElementFinder = this._getDiagramDesignLink(correlationId);
    await browser.wait(ExpectedConditions.visibilityOf(diagramDesignLink), browser.params.defaultTimeoutMS);

    return diagramDesignLink.isDisplayed();
  }

  public async clickOnDiagramDesignLink(correlationId: string): Promise<void> {
    const diagramDesignLink: ElementFinder = this._getDiagramDesignLink(correlationId);
    await browser.wait(ExpectedConditions.visibilityOf(diagramDesignLink), browser.params.defaultTimeoutMS);

    return diagramDesignLink.click();
  }

  public async getVisbilityOfUserTaskLink(correlationId: string): Promise<boolean> {
    const userTaskLink: ElementFinder = this._getUserTaskLink(correlationId);
    await browser.wait(ExpectedConditions.visibilityOf(userTaskLink), browser.params.defaultTimeoutMS);

    return userTaskLink.isDisplayed();
  }

  public async clickOnUserTaskLink(correlationId: string): Promise<void> {
    const userTaskLink: ElementFinder = this._getUserTaskLink(correlationId);
    await browser.wait(ExpectedConditions.visibilityOf(userTaskLink), browser.params.defaultTimeoutMS);

    return userTaskLink.click();
  }

  private get _processListContainer(): ElementFinder {
    const processListContainerbyId: By = by.id(this._processListContainerId);

    return element(processListContainerbyId);
  }

  private _getListEntry(correlationId: string): ElementFinder {
    const listEntryId: string = `${this._listEntryIdentifier}${correlationId}`;
    const listEntryById: By = by.id(listEntryId);

    return element(listEntryById);
  }

  private _getDiagramDesignLink(correlationId: string): ElementFinder {
    const listEntryId: string = `${this._listEntryIdentifier}${correlationId}`;
    const listEntryById: By = by.id(listEntryId);
    const diagramLinkByTag: By = by.className(this._diagramLinkClassName);

    return element(listEntryById)
      .all(diagramLinkByTag)
      .first();
  }

  private _getUserTaskLink(correlationId: string): ElementFinder {
    const listEntryId: string = `${this._listEntryIdentifier}${correlationId}`;
    const listEntryById: By = by.id(listEntryId);
    const diagramLinkByTag: By = by.className(this._userTaskLinkClassName);

    return element(listEntryById)
      .all(diagramLinkByTag)
      .first();
  }
}
