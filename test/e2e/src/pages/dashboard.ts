import {ElementFinder, ExpectedConditions, browser, by, element} from 'protractor';

import {By} from 'selenium-webdriver';

export class Dashboard {
  public url: string;

  private dashboardContainerId: string = 'dashboardContainer';
  private processListContainerId: string = 'processListContainer';
  private taskListContainerId: string = 'taskListContainer';

  constructor(applicationUrl: string) {
    this.url = `${applicationUrl}/inspect/dashboard`;
  }

  public async show(): Promise<void> {
    await browser.get(this.url);
    await browser.wait(ExpectedConditions.visibilityOf(this.dashboardContainer), browser.params.defaultTimeoutMS);
  }

  public async getVisibilityOfDashboardContainer(): Promise<boolean> {
    await browser.wait(ExpectedConditions.visibilityOf(this.dashboardContainer), browser.params.defaultTimeoutMS);

    return this.dashboardContainer.isDisplayed();
  }

  public async getVisibilityOfProcessListContainer(): Promise<boolean> {
    await browser.wait(ExpectedConditions.visibilityOf(this.processListContainer), browser.params.defaultTimeoutMS);

    return this.processListContainer.isDisplayed();
  }

  public async getVisibilityOfTaskListContainer(): Promise<boolean> {
    await browser.wait(ExpectedConditions.visibilityOf(this.taskListContainer), browser.params.defaultTimeoutMS);

    return this.taskListContainer.isDisplayed();
  }

  private get dashboardContainer(): ElementFinder {
    const dashboardContainerById: By = by.id(this.dashboardContainerId);

    return element(dashboardContainerById);
  }

  private get processListContainer(): ElementFinder {
    const processListContainerbyId: By = by.id(this.processListContainerId);

    return element(processListContainerbyId);
  }

  private get taskListContainer(): ElementFinder {
    const taskListContainerById: By = by.id(this.taskListContainerId);

    return element(taskListContainerById);
  }
}
