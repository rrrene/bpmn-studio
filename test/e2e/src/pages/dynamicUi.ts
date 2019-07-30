import {ElementFinder, ExpectedConditions, browser, by, element} from 'protractor';

import {By} from 'selenium-webdriver';

export class DynamicUi {
  private _dynamicUiWrapperTag: string = 'dynamic-ui-wrapper';

  public async getVisibilityOfDynamicUiWrapper(): Promise<boolean> {
    await browser.wait(ExpectedConditions.visibilityOf(this._dynamicUiWrapper), browser.params.defaultTimeoutMS);

    return this._dynamicUiWrapper.isDisplayed();
  }

  private get _dynamicUiWrapper(): ElementFinder {
    const dynamicUiWrapperByTag: By = by.tagName(this._dynamicUiWrapperTag);

    return element(dynamicUiWrapperByTag);
  }
}
