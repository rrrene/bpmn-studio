import {ElementArrayFinder, ElementFinder, ExpectedConditions, browser, by, element} from 'protractor';

import {By} from 'selenium-webdriver';

export class LiveExecutionTracker {
  public url: string;

  private liveExecutionTrackerContainerId: string = 'liveExecutionTrackerContainer';

  constructor(applicationUrl: string, correlationId: string, diagramName: string, processInstanceId: string) {
    // tslint:disable-next-line max-line-length
    this.url = `${applicationUrl}/correlation/${correlationId}/diagram/${diagramName}/instance/${processInstanceId}/live-execution-tracker?solutionUri=http%3A%2F%2Flocalhost%3A8000`;
  }

  public async show(): Promise<void> {
    await browser.get(this.url);

    await browser.wait(
      ExpectedConditions.visibilityOf(this.liveExecutionTrackerContainer),
      browser.params.defaultTimeoutMS,
    );
  }

  public async getVisibilityOfLiveExecutionTrackerContainer(): Promise<boolean> {
    this.waitForVisbilityOfElement(this.liveExecutionTrackerContainer);

    return this.liveExecutionTrackerContainer.isDisplayed();
  }

  public async getVisibilityOfInactiveCallActivityOverlay(): Promise<boolean> {
    this.waitForVisbilityOfElement(this.callActivityOverlays);

    return this.callActivityOverlays.isDisplayed();
  }

  public async getVisbilityOfEmptyActivityOverlay(): Promise<boolean> {
    await this.waitForVisbilityOfElement(this.emptyActivityOverlays);

    return this.emptyActivityOverlays.isDisplayed();
  }

  private async waitForVisbilityOfElement(finder: ElementFinder): Promise<void> {
    const finderVisibility: Function = ExpectedConditions.visibilityOf(finder);

    await browser.wait(finderVisibility, browser.params.defaultTimeoutMS).catch(() => {
      // If this timeouts do nothing.
      // We are basically supressing the timeout error here.
      // This way we get better error messages for debugging by the actual test function.
    });
  }

  private get liveExecutionTrackerContainer(): ElementFinder {
    const liveExecutionTrackerContainerById: By = by.id(this.liveExecutionTrackerContainerId);

    return element(liveExecutionTrackerContainerById);
  }

  private get callActivityOverlays(): ElementFinder {
    const callActivityOverlaysByCss: By = by.className('fas fa-search let__overlay-button-icon');

    return element(callActivityOverlaysByCss);
  }

  private get emptyActivityOverlays(): ElementFinder {
    const emptyActivityOverlaysByCss: By = by.className('fas fa-play let__overlay-button-icon overlay__empty-task');

    const allEmptyActivityOverlays: ElementArrayFinder = element.all(emptyActivityOverlaysByCss);

    return allEmptyActivityOverlays.first();
  }
}
