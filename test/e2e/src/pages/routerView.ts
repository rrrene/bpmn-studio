import {ElementFinder, ExpectedConditions, browser, by, element} from 'protractor';

import {By} from 'selenium-webdriver';

export class RouterView {
  private routerViewTagName: string = 'router-view';

  public async show(): Promise<void> {
    await browser.get(browser.params.aureliaUrl);

    await browser.wait(ExpectedConditions.visibilityOf(this.routerViewContainer), browser.params.defaultTimeoutMS);
  }

  private get routerViewContainer(): ElementFinder {
    const routerViewByTagName: By = by.tagName(this.routerViewTagName);

    return element(routerViewByTagName);
  }
}
