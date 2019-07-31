import {ElementFinder, ExpectedConditions, browser, by, element} from 'protractor';

import {By} from 'selenium-webdriver';

export class DynamicUi {
  private dynamicUiWrapperTag: string = 'dynamic-ui-wrapper';

  public async getVisibilityOfDynamicUiWrapper(): Promise<boolean> {
    await browser.wait(ExpectedConditions.visibilityOf(this.dynamicUiWrapper), browser.params.defaultTimeoutMS);

    return this.dynamicUiWrapper.isDisplayed();
  }

  private get dynamicUiWrapper(): ElementFinder {
    const dynamicUiWrapperByTag: By = by.tagName(this.dynamicUiWrapperTag);

    return element(dynamicUiWrapperByTag);
  }
}
