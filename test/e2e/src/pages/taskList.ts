import {ElementFinder, ExpectedConditions, browser, by, element} from 'protractor';

import {By} from 'selenium-webdriver';

export class TaskList {
  public url: string;
  public urlWithProcessInstanceId: string;

  private listEntryIdentifier: string = 'taskList-';
  private taskListContainerId: string = 'taskListContainer';
  private diagramLinkClassName: string = 'task-list-item-modelname';
  private continueButtonClassName: string = 'task-list-continue-button';

  constructor(applicationUrl: string, processInstanceId?: string) {
    this.url = `${applicationUrl}/task`;
    this.urlWithProcessInstanceId = `${applicationUrl}/instance/${processInstanceId}/task`;
  }

  public async show(): Promise<void> {
    await browser.get(this.url);

    await browser.wait(ExpectedConditions.visibilityOf(this.taskListContainer), browser.params.defaultTimeoutMS);
  }

  public async getVisibilityOfTaskListContainer(): Promise<boolean> {
    await browser.wait(ExpectedConditions.visibilityOf(this.taskListContainer), browser.params.defaultTimeoutMS);

    return this.taskListContainer.isDisplayed();
  }

  public async getVisibilityOfListEntry(diagramName: string): Promise<boolean> {
    const listEntry: ElementFinder = this.getListEntry(diagramName);
    await browser.wait(ExpectedConditions.visibilityOf(listEntry), browser.params.defaultTimeoutMS);

    return listEntry.isDisplayed();
  }

  public async getVisibilityOfDesignLink(diagramName: string): Promise<boolean> {
    const designLink: ElementFinder = this.getDiagramDesignLink(diagramName);
    await browser.wait(ExpectedConditions.visibilityOf(designLink), browser.params.defaultTimeoutMS);

    return designLink.isDisplayed();
  }

  public async clickOnDesignLink(diagramName: string): Promise<void> {
    const designLink: ElementFinder = this.getDiagramDesignLink(diagramName);
    await browser.wait(ExpectedConditions.visibilityOf(designLink), browser.params.defaultTimeoutMS);

    return designLink.click();
  }

  public async getVisbilityOfContinueButton(diagramName: string): Promise<boolean> {
    const continueButton: ElementFinder = this.getContinueButton(diagramName);
    await browser.wait(ExpectedConditions.visibilityOf(continueButton), browser.params.defaultTimeoutMS);

    return continueButton.isDisplayed();
  }

  public async clickOnContinueButton(diagramName: string): Promise<void> {
    const continueButton: ElementFinder = this.getContinueButton(diagramName);
    await browser.wait(ExpectedConditions.visibilityOf(continueButton), browser.params.defaultTimeoutMS);

    return continueButton.click();
  }

  private get taskListContainer(): ElementFinder {
    const taskListContainerById: By = by.id(this.taskListContainerId);

    return element(taskListContainerById);
  }

  private getListEntry(diagramName: string): ElementFinder {
    const listEntryId: string = `${this.listEntryIdentifier}${diagramName}`;
    const listEntryById: By = by.id(listEntryId);

    return element(listEntryById);
  }

  private getDiagramDesignLink(diagramName: string): ElementFinder {
    const listEntryId: string = `${this.listEntryIdentifier}${diagramName}`;
    const listEntryById: By = by.id(listEntryId);
    const diagramLinkByTag: By = by.className(this.diagramLinkClassName);

    return element(listEntryById)
      .all(diagramLinkByTag)
      .first();
  }

  private getContinueButton(diagramName: string): ElementFinder {
    const listEntryId: string = `${this.listEntryIdentifier}${diagramName}`;
    const listEntryById: By = by.id(listEntryId);
    const diagramLinkByTag: By = by.className(this.continueButtonClassName);

    return element(listEntryById)
      .all(diagramLinkByTag)
      .first();
  }
}
