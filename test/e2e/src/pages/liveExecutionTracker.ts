import {browser, by, element, ElementFinder, ExpectedConditions} from 'protractor';

import {By} from 'selenium-webdriver';

export class LiveExecutionTracker {

  public url: string;

  private _liveExecutionTrackerContainerId: string = 'liveExecutionTrackerContainer';

  constructor(applicationUrl: string, correlationId: string, diagramName: string, processInstanceId: string) {
    // tslint:disable-next-line max-line-length
    this.url = `${applicationUrl}/correlation/${correlationId}/diagram/${diagramName}/instance/${processInstanceId}/live-execution-tracker?solutionUri=http%3A%2F%2Flocalhost%3A8000`;
  }

  public async show(): Promise<void> {
    await browser.get(this.url);

    await browser.wait(ExpectedConditions.visibilityOf(this._liveExecutionTrackerContainer), browser.params.defaultTimeoutMS);
  }

  public async getVisibilityOfLiveExecutionTrackerContainer(): Promise<boolean> {
    await browser.wait(ExpectedConditions.visibilityOf(this._liveExecutionTrackerContainer), browser.params.defaultTimeoutMS);

    return this._liveExecutionTrackerContainer.isDisplayed();
  }

  private get _liveExecutionTrackerContainer(): ElementFinder {
    const liveExecutionTrackerContainerById: By = by.id(this._liveExecutionTrackerContainerId);

    return element(liveExecutionTrackerContainerById);
  }
}
