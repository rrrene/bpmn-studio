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
    this._waitForVisbilityOfElement(this._liveExecutionTrackerContainer);

    return this._liveExecutionTrackerContainer.isDisplayed();
  }

  public async getVisibilityOfInactiveCallActivityOverlay(): Promise<boolean> {
    this._waitForVisbilityOfElement(this._callActivityOverlays);

    return this._callActivityOverlays.isDisplayed();
  }

  public async getVisbilityOfEmptyTaskOverlay(): Promise<boolean> {
    await this._waitForVisbilityOfElement(this._emptyTaskOverlays);

    return this._emptyTaskOverlays.isDisplayed();
  }

  private async _waitForVisbilityOfElement(finder: ElementFinder): Promise<void> {
    const finderVisibility: Function = ExpectedConditions.visibilityOf(finder);

    await browser.wait(finderVisibility, browser.params.defaultTimeoutMS).catch(() => {
      // If this timeouts do nothing.
      // We are basically supressing the timeout error here.
      // This way we get better error messages for debugging by the actual test function.
    });
  }

  private get _liveExecutionTrackerContainer(): ElementFinder {
    const liveExecutionTrackerContainerById: By = by.id(this._liveExecutionTrackerContainerId);

    return element(liveExecutionTrackerContainerById);
  }

  private get _callActivityOverlays(): ElementFinder {
    const _callActivityOverlaysByCss: By = by.className('fa-search let__overlay-button-icon');

    return element(_callActivityOverlaysByCss);
  }

  private get _emptyTaskOverlays(): ElementFinder {
    const _emptyTaskOverlaysByCss: By = by.className('fas fa-play let__overlay-button-icon overlay__empty-task');

    return element(_emptyTaskOverlaysByCss);
  }
}
