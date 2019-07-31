import {ElementFinder, ExpectedConditions, browser, by, element} from 'protractor';

import {By} from 'selenium-webdriver';

export class StatusBar {
  private statusBarTag: string = 'status-bar';
  private leftStatusBarContainerId: string = 'statusBarLeft';
  private centerStatusBarContainerId: string = 'statusBarCenter';
  private rightStatusBarContainerId: string = 'statusBarRight';

  private enableXmlViewButtonId: string = 'statusBarXMLViewButton';
  private disableXmlViewButtonId: string = 'statusBarDisableXMLViewButton';

  private enableDiffViewButtonId: string = 'statusBarDiffViewButton';
  private disableDiffViewButtonId: string = 'statusBarDisableDiffViewButton';

  private newVsOldButtonId: string = 'statusBarNewVsOld';
  private oldVsNewButtonId: string = 'statusBarOldVsNew';
  private changeLogButtonId: string = 'statusBarChangesLog';

  private activeClass: string = 'status-barelement--active';

  public async show(): Promise<void> {
    const statusBarContainer: ElementFinder = this.statusBarContainer;

    await browser.wait(ExpectedConditions.visibilityOf(statusBarContainer), browser.params.defaultTimeoutMS);
  }

  public async getVisibilityOfLeftContainer(): Promise<boolean> {
    return this.leftStatusBarContainer.isDisplayed();
  }

  public async getVisibilityOfCenterContainer(): Promise<boolean> {
    return this.centerStatusBarContainer.isDisplayed();
  }

  public async getVisibilityOfRightContainer(): Promise<boolean> {
    return this.rightStatusBarContainer.isDisplayed();
  }

  // General Design Buttons

  public async getVisibilityOfEnableXmlViewButton(): Promise<boolean> {
    return this.enableXmlViewButton.isDisplayed();
  }

  public async clickOnEnableXmlViewButton(): Promise<void> {
    return this.enableXmlViewButton.click();
  }

  public async getVisibilityOfDisableXmlViewButton(): Promise<boolean> {
    return this.disableXmlViewButton.isDisplayed();
  }

  public async clickOnDisableXmlViewButton(): Promise<void> {
    return this.disableXmlViewButton.click();
  }

  public async getVisibilityOfEnableDiffViewButton(): Promise<boolean> {
    return this.enableDiffViewButton.isDisplayed();
  }

  public async clickOnEnableDiffViewButton(): Promise<void> {
    return this.enableDiffViewButton.click();
  }

  public async getVisibilityOfDisableDiffViewButton(): Promise<boolean> {
    return this.disableDiffViewButton.isDisplayed();
  }

  public async clickOnDisableDiffViewButton(): Promise<void> {
    return this.disableDiffViewButton.click();
  }

  // Diff View Buttons

  public async getVisibilityOfNewVsOldButton(): Promise<boolean> {
    return this.newVsOldButton.isDisplayed();
  }

  public async clickOnNewVsOldButton(): Promise<void> {
    return this.newVsOldButton.click();
  }

  public async getActiveStateOfNewVsOldButton(): Promise<boolean> {
    const classNames: string = await this.newVsOldButton.getAttribute('class');
    const buttonIsActive: boolean = classNames.includes(this.activeClass);

    return buttonIsActive;
  }

  public async getVisibilityOfOldVsNewButton(): Promise<boolean> {
    return this.oldVsNewButton.isDisplayed();
  }

  public async clickOnOldVsNewButton(): Promise<void> {
    return this.oldVsNewButton.click();
  }

  public async getActiveStateOfOldVsNewButton(): Promise<boolean> {
    const classNames: string = await this.oldVsNewButton.getAttribute('class');
    const buttonIsActive: boolean = classNames.includes(this.activeClass);

    return buttonIsActive;
  }

  public async getVisibilityOfChangeLogButton(): Promise<boolean> {
    return this.changeLogButton.isDisplayed();
  }

  public async clickOnChangeLogButton(): Promise<void> {
    return this.changeLogButton.click();
  }

  public async getActiveStateOfChangeLogButton(): Promise<boolean> {
    const classNames: string = await this.changeLogButton.getAttribute('class');
    const buttonIsActive: boolean = classNames.includes(this.activeClass);

    return buttonIsActive;
  }

  private get statusBarContainer(): ElementFinder {
    const statusBarByTag: By = by.tagName(this.statusBarTag);

    return element(statusBarByTag);
  }

  private get leftStatusBarContainer(): ElementFinder {
    const leftContainerById: By = by.id(this.leftStatusBarContainerId);

    return element(leftContainerById);
  }

  private get centerStatusBarContainer(): ElementFinder {
    const centerContainerById: By = by.id(this.centerStatusBarContainerId);

    return element(centerContainerById);
  }

  private get rightStatusBarContainer(): ElementFinder {
    const rightContainerById: By = by.id(this.rightStatusBarContainerId);

    return element(rightContainerById);
  }

  private get enableXmlViewButton(): ElementFinder {
    const showXmlButtonById: By = by.id(this.enableXmlViewButtonId);

    return element(showXmlButtonById);
  }

  private get disableXmlViewButton(): ElementFinder {
    const disabelXmlViewButtonById: By = by.id(this.disableXmlViewButtonId);

    return element(disabelXmlViewButtonById);
  }

  private get enableDiffViewButton(): ElementFinder {
    const showDiffButtonById: By = by.id(this.enableDiffViewButtonId);

    return element(showDiffButtonById);
  }

  private get disableDiffViewButton(): ElementFinder {
    const disableDiffViewButtonById: By = by.id(this.disableDiffViewButtonId);

    return element(disableDiffViewButtonById);
  }

  private get newVsOldButton(): ElementFinder {
    const newVsOldButtonById: By = by.id(this.newVsOldButtonId);

    return element(newVsOldButtonById);
  }

  private get oldVsNewButton(): ElementFinder {
    const oldVsNewButtonId: By = by.id(this.oldVsNewButtonId);

    return element(oldVsNewButtonId);
  }

  private get changeLogButton(): ElementFinder {
    const changeLogButtonById: By = by.id(this.changeLogButtonId);

    return element(changeLogButtonById);
  }
}
