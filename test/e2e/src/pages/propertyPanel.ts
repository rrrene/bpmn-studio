import {ElementFinder, ExpectedConditions, browser, by, element} from 'protractor';

import {By} from 'selenium-webdriver';

export class PropertyPanel {
  private propertyPanelContainerId: string = 'js-properties-panel';
  private generalBasicsSectionId: string = 'js-general-basics-section';
  private generalCallActivitySectionId: string = 'js-general-callActivity-section';
  private generalConditionalEventSectionId: string = 'js-general-conditionalEvent-section';
  private generalErrorEventSectionId: string = 'js-general-errorEvent-section';
  private generalEscalationEventSectionId: string = 'js-general-escalationEvent-section';
  private generalFlowSectionId: string = 'js-general-flow-section';
  private generalMessageEventSectionId: string = 'js-general-messageEvent-section';
  private generalMessageTaskSectionId: string = 'js-general-messageTask-section';
  private generalPoolSectionId: string = 'js-general-pool-section';
  private generalProcessSectionId: string = 'js-general-process-section';
  private generalScriptTaskSectionId: string = 'js-general-scriptTask-section';
  private generalServiceTaskSectionId: string = 'js-general-serviceTask-section';
  private generalSignalEventSectionId: string = 'js-general-signalEvent-section';
  private generalTimerEventSectionId: string = 'js-general-timerEvent-section';
  private extensionsBasicsSectionId: string = 'js-extensions-basics-section';
  private extensionsProcessSectionId: string = 'js-extensions-process-section';
  private formsBasicsSectionId: string = 'js-forms-basics-section';

  public async show(): Promise<void> {
    const containerVisbility: Function = ExpectedConditions.visibilityOf(this.propertyPanelContainer);

    await browser.wait(containerVisbility, browser.params.defaultTimeoutMS);
  }

  public async getVisbilityOfPropertyPanelContainer(): Promise<boolean> {
    this.waitForVisbilityOfElement(this.propertyPanelContainer);

    return this.propertyPanelContainer.isDisplayed();
  }

  public async getVisibilityOfGeneralBasicsSection(): Promise<boolean> {
    await this.waitForVisbilityOfElement(this.generalBasicsSection);

    return this.generalBasicsSection.isDisplayed();
  }

  public async getVisibilityOfCallActivitySection(): Promise<boolean> {
    await this.waitForVisbilityOfElement(this.callActivitySection);

    return this.callActivitySection.isDisplayed();
  }

  public async getVisibilityOfConditionalEventSection(): Promise<boolean> {
    await this.waitForVisbilityOfElement(this.conditionalEventSection);

    return this.conditionalEventSection.isDisplayed();
  }

  public async getVisibilityOfErrorEventSection(): Promise<boolean> {
    await this.waitForVisbilityOfElement(this.errorEventSection);

    return this.errorEventSection.isDisplayed();
  }

  public async getVisibilityOfEscalationEventSection(): Promise<boolean> {
    await this.waitForVisbilityOfElement(this.escalationEventSection);

    return this.escalationEventSection.isDisplayed();
  }

  public async getVisibilityOfFlowSection(): Promise<boolean> {
    await this.waitForVisbilityOfElement(this.flowSection);

    return this.flowSection.isDisplayed();
  }

  public async getVisibilityOfMessageEventSection(): Promise<boolean> {
    await this.waitForVisbilityOfElement(this.messageEventSection);

    return this.messageEventSection.isDisplayed();
  }

  public async getVisibilityOfMessageTaskSection(): Promise<boolean> {
    await this.waitForVisbilityOfElement(this.messageTaskSection);

    return this.messageTaskSection.isDisplayed();
  }

  public async getVisibilityOfPoolSection(): Promise<boolean> {
    await this.waitForVisbilityOfElement(this.poolSection);

    return this.poolSection.isDisplayed();
  }

  public async getVisibilityOfScriptTaskSection(): Promise<boolean> {
    await this.waitForVisbilityOfElement(this.scriptTaskSection);

    return this.scriptTaskSection.isDisplayed();
  }

  public async getVisibilityOfGeneralProcessSection(): Promise<boolean> {
    await this.waitForVisbilityOfElement(this.generalProcessSection);

    return this.generalProcessSection.isDisplayed();
  }

  public async getVisbilityOfServiceTaskSection(): Promise<boolean> {
    await this.waitForVisbilityOfElement(this.serviceTaskSection);

    return this.serviceTaskSection.isDisplayed();
  }

  public async getVisbilityOfSignalEventSection(): Promise<boolean> {
    await this.waitForVisbilityOfElement(this.signalEventSection);

    return this.signalEventSection.isDisplayed();
  }

  public async getVisbilityOfTimerEventSection(): Promise<boolean> {
    await this.waitForVisbilityOfElement(this.timerEventSection);

    return this.timerEventSection.isDisplayed();
  }

  public async getVisbilityOfExtensionsBasicSection(): Promise<boolean> {
    await this.waitForVisbilityOfElement(this.extensionsBasicsSection);

    return this.extensionsBasicsSection.isDisplayed();
  }

  public async getPresenceOfExtensionsBasicSection(): Promise<boolean> {
    await this.waitForVisbilityOfElement(this.extensionsBasicsSection);

    return this.extensionsBasicsSection.isPresent();
  }

  public async getVisbilityOfExtensionsProcessSection(): Promise<boolean> {
    await this.waitForVisbilityOfElement(this.extensionsProcessSection);

    return this.extensionsProcessSection.isDisplayed();
  }

  public async getVisbilityOfFormBasicsSection(): Promise<boolean> {
    await this.waitForVisbilityOfElement(this.formBasicsSection);

    return this.formBasicsSection.isDisplayed();
  }

  private async waitForVisbilityOfElement(finder: ElementFinder): Promise<void> {
    const finderVisibility: Function = ExpectedConditions.visibilityOf(finder);

    await browser.wait(finderVisibility, browser.params.defaultTimeoutMS).catch(() => {
      // If this timeouts do nothing.
      // We are basically supressing the timeout error here.
      // This way we get better error messages for debugging by the actual test function.
    });
  }

  private get propertyPanelContainer(): ElementFinder {
    const propertyPanelContainerById: By = by.id(this.propertyPanelContainerId);

    return element(propertyPanelContainerById);
  }

  private get generalBasicsSection(): ElementFinder {
    const generalBasicsSectionById: By = by.id(this.generalBasicsSectionId);

    return element(generalBasicsSectionById);
  }

  private get callActivitySection(): ElementFinder {
    const callActivitySectionById: By = by.id(this.generalCallActivitySectionId);

    return element(callActivitySectionById);
  }

  private get conditionalEventSection(): ElementFinder {
    const conditionalEventSectionById: By = by.id(this.generalConditionalEventSectionId);

    return element(conditionalEventSectionById);
  }

  private get errorEventSection(): ElementFinder {
    const errorEventSectionById: By = by.id(this.generalErrorEventSectionId);

    return element(errorEventSectionById);
  }

  private get escalationEventSection(): ElementFinder {
    const escalationEventSectionById: By = by.id(this.generalEscalationEventSectionId);

    return element(escalationEventSectionById);
  }

  private get flowSection(): ElementFinder {
    const flowSectionById: By = by.id(this.generalFlowSectionId);

    return element(flowSectionById);
  }

  private get messageEventSection(): ElementFinder {
    const messageEventSectionById: By = by.id(this.generalMessageEventSectionId);

    return element(messageEventSectionById);
  }

  private get messageTaskSection(): ElementFinder {
    const messageTaskSectionById: By = by.id(this.generalMessageTaskSectionId);

    return element(messageTaskSectionById);
  }

  private get poolSection(): ElementFinder {
    const poolSectionById: By = by.id(this.generalPoolSectionId);

    return element(poolSectionById);
  }

  private get generalProcessSection(): ElementFinder {
    const processSectionById: By = by.id(this.generalProcessSectionId);

    return element(processSectionById);
  }

  private get scriptTaskSection(): ElementFinder {
    const scriptTaskSectionById: By = by.id(this.generalScriptTaskSectionId);

    return element(scriptTaskSectionById);
  }

  private get serviceTaskSection(): ElementFinder {
    const serviceTaskSectionById: By = by.id(this.generalServiceTaskSectionId);

    return element(serviceTaskSectionById);
  }

  private get signalEventSection(): ElementFinder {
    const signalEventSectionById: By = by.id(this.generalSignalEventSectionId);

    return element(signalEventSectionById);
  }

  private get timerEventSection(): ElementFinder {
    const timerEventSectionById: By = by.id(this.generalTimerEventSectionId);

    return element(timerEventSectionById);
  }

  private get extensionsBasicsSection(): ElementFinder {
    const extensionsBasicsSectionById: By = by.id(this.extensionsBasicsSectionId);

    return element(extensionsBasicsSectionById);
  }

  private get extensionsProcessSection(): ElementFinder {
    const extensionsProcessSectionById: By = by.id(this.extensionsProcessSectionId);

    return element(extensionsProcessSectionById);
  }

  private get formBasicsSection(): ElementFinder {
    const formBasicsSection: By = by.id(this.formsBasicsSectionId);

    return element(formBasicsSection);
  }
}
