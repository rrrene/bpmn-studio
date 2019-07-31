import {ElementArrayFinder, ElementFinder, ExpectedConditions, browser, by, element} from 'protractor';

import {By} from 'selenium-webdriver';

export class DiagramDetail {
  public url: string;

  private diagramDetailContainerId: string = 'diagramDetailContainer';
  private bpmnioContainerTag: string = 'bpmn-io';

  constructor(applicationUrl: string, diagramName: string) {
    this.url = `${applicationUrl}/design/detail/diagram/${diagramName}?solutionUri=http%3A%2F%2Flocalhost%3A8000`;
  }

  public async show(): Promise<void> {
    await browser.get(this.url);

    await browser.wait(ExpectedConditions.visibilityOf(this.diagramDetailContainer), browser.params.defaultTimeoutMS);
  }

  public async clickOnElement(elementId: string): Promise<void> {
    await browser.wait(ExpectedConditions.visibilityOf(this.bpmnIoContainer), browser.params.defaultTimeoutMS);

    const cssString: string = `[data-element-id="${elementId}"]`;

    const elementByCss: By = by.css(cssString);
    const bpmnElements: ElementArrayFinder = element.all(elementByCss);

    return bpmnElements.first().click();
  }

  public async getVisibilityOfDiagramDetailContainer(): Promise<boolean> {
    await browser.wait(ExpectedConditions.visibilityOf(this.diagramDetailContainer), browser.params.defaultTimeoutMS);

    return this.diagramDetailContainer.isDisplayed();
  }

  public async getVisibilityOfBpmnIoContainer(): Promise<boolean> {
    await browser.wait(ExpectedConditions.visibilityOf(this.bpmnIoContainer), browser.params.defaultTimeoutMS);

    return this.bpmnIoContainer.isDisplayed();
  }

  private get diagramDetailContainer(): ElementFinder {
    const diagramDetailContainerById: By = by.id(this.diagramDetailContainerId);

    return element(diagramDetailContainerById);
  }

  private get bpmnIoContainer(): ElementFinder {
    const bpmnIoContainerByTag: By = by.tagName(this.bpmnioContainerTag);

    return element(bpmnIoContainerByTag);
  }
}
