import {ElementArrayFinder, ElementFinder, ExpectedConditions, browser, by, element} from 'protractor';

import {By} from 'selenium-webdriver';

export class XmlView {
  public url: string;
  public urlWithoutQueryParams: string;

  private xmlViewContainerId: string = 'diagramXmlContainer';

  constructor(applicationUrl: string, diagramName: string) {
    this.url = `${applicationUrl}/design/xml/diagram/${diagramName}?solutionUri=http%3A%2F%2Flocalhost%3A8000`;
    this.urlWithoutQueryParams = `${applicationUrl}/design/xml/diagram/${diagramName}`;
  }

  public async show(): Promise<void> {
    await browser.get(this.url);

    await browser.wait(ExpectedConditions.visibilityOf(this.xmlViewContainer), browser.params.defaultTimeoutMS);
  }

  public async getVisibilityOfXmlViewContainer(): Promise<boolean> {
    this.waitForVisbilityOfElement(this.xmlViewContainer);

    return this.xmlViewContainer.isDisplayed();
  }

  public async getVisbilityOfXMLCodeBlock(): Promise<boolean> {
    this.waitForVisbilityOfElement(this.xmlCodeBlock);

    return this.xmlViewContainer.isDisplayed();
  }

  public async getVisbilityOfLineNumbers(): Promise<boolean> {
    this.waitForVisbilityOfElement(this.lineNumbers.first());

    return this.lineNumbers.isDisplayed();
  }

  public async getVisbilityOfCodeLines(): Promise<boolean> {
    this.waitForVisbilityOfElement(this.codeLines.first());

    return this.codeLines.isDisplayed();
  }

  private async waitForVisbilityOfElement(finder: ElementFinder): Promise<void> {
    const finderVisibility: Function = ExpectedConditions.visibilityOf(finder);

    await browser.wait(finderVisibility, browser.params.defaultTimeoutMS).catch(() => {
      // If this timeouts do nothing.
      // We are basically supressing the timeout error here.
      // This way we get better error messages for debugging by the actual test function.
    });
  }

  private get xmlViewContainer(): ElementFinder {
    const xmlViewContainerById: By = by.id(this.xmlViewContainerId);

    return element(xmlViewContainerById);
  }

  private get xmlCodeBlock(): ElementFinder {
    const codeBlockByTag: By = by.tagName('code');

    return element(codeBlockByTag);
  }

  private get lineNumbers(): ElementArrayFinder {
    const lineNumbersByCss: By = by.css('hljs-ln-numbers');

    return element.all(lineNumbersByCss);
  }

  private get codeLines(): ElementArrayFinder {
    const codeLinesByCss: By = by.css('hljs-ln-code');

    return element.all(codeLinesByCss);
  }
}
