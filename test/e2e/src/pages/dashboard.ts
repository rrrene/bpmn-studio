import { browser, by, element, ElementFinder, ExpectedConditions } from 'protractor';

import { By } from 'selenium-webdriver';

export class Dashboard {
  public url: string;

  private _dashboardContainerId: string = 'dashboardContainer';
  private _processListContainerId: string = 'processListContainer';
  private _taskListContainerId: string = 'taskListContainer';

  constructor(applicationUrl: string) {
    this.url = `${applicationUrl}/inspect/dashboard`;
  }

  public async show(): Promise<void> {
    await browser.get(this.url);
    await browser.wait(ExpectedConditions.visibilityOf(this._dashboardContainer), browser.params.defaultTimeoutMS);
  }

  public async getVisibilityOfDashboardContainer(): Promise<boolean> {
    await browser.wait(ExpectedConditions.visibilityOf(this._dashboardContainer), browser.params.defaultTimeoutMS);

    return this._dashboardContainer.isDisplayed();
  }

  public async getVisibilityOfProcessListContainer(): Promise<boolean> {
    await browser.wait(ExpectedConditions.visibilityOf(this._processListContainer), browser.params.defaultTimeoutMS);

    return this._processListContainer.isDisplayed();
  }

  public async getVisibilityOfTaskListContainer(): Promise<boolean> {
    await browser.wait(ExpectedConditions.visibilityOf(this._taskListContainer), browser.params.defaultTimeoutMS);

    return this._taskListContainer.isDisplayed();
  }

  private get _dashboardContainer(): ElementFinder {
    const dashboardContainerById: By = by.id(this._dashboardContainerId);

    return element(dashboardContainerById);
  }

  private get _processListContainer(): ElementFinder {
    const processListContainerbyId: By = by.id(this._processListContainerId);

    return element(processListContainerbyId);
  }

  private get _taskListContainer(): ElementFinder {
    const taskListContainerById: By = by.id(this._taskListContainerId);

    return element(taskListContainerById);
  }
}
