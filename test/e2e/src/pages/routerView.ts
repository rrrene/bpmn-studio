import {browser, by, element, ElementFinder, ExpectedConditions} from 'protractor';

import {By} from 'selenium-webdriver';

export class RouterView {
  private _routerViewTagName: string = 'router-view';

  public async show(): Promise<void> {
    await browser.get(browser.params.aureliaUrl);

    await browser.wait(ExpectedConditions.visibilityOf(this._routerViewContainer), browser.params.defaultTimeoutMS);
  }

  private get _routerViewContainer(): ElementFinder {
    const routerViewByTagName: By = by.tagName(this._routerViewTagName);

    return element(routerViewByTagName);
  }
}
