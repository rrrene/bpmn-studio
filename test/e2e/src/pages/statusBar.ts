import {ElementFinder, ExpectedConditions, browser, by, element} from 'protractor';

import {By} from 'selenium-webdriver';

export class StatusBar {
  private _statusBarTag: string = 'status-bar';
  private _leftStatusBarContainerId: string = 'statusBarLeft';
  private _centerStatusBarContainerId: string = 'statusBarCenter';
  private _rightStatusBarContainerId: string = 'statusBarRight';

  private _enableXmlViewButtonId: string = 'statusBarXMLViewButton';
  private _disableXmlViewButtonId: string = 'statusBarDisableXMLViewButton';

  private _enableDiffViewButtonId: string = 'statusBarDiffViewButton';
  private _disableDiffViewButtonId: string = 'statusBarDisableDiffViewButton';

  private _newVsOldButtonId: string = 'statusBarNewVsOld';
  private _oldVsNewButtonId: string = 'statusBarOldVsNew';
  private _changeLogButtonId: string = 'statusBarChangesLog';

  private _activeClass: string = 'status-bar__element--active';

  public async show(): Promise<void> {
    const statusBarContainer: ElementFinder = this._statusBarContainer;

    await browser.wait(ExpectedConditions.visibilityOf(statusBarContainer), browser.params.defaultTimeoutMS);
  }

  public async getVisibilityOfLeftContainer(): Promise<boolean> {
    return this._leftStatusBarContainer.isDisplayed();
  }

  public async getVisibilityOfCenterContainer(): Promise<boolean> {
    return this._centerStatusBarContainer.isDisplayed();
  }

  public async getVisibilityOfRightContainer(): Promise<boolean> {
    return this._rightStatusBarContainer.isDisplayed();
  }

  // General Design Buttons

  public async getVisibilityOfEnableXmlViewButton(): Promise<boolean> {
    return this._enableXmlViewButton.isDisplayed();
  }

  public async clickOnEnableXmlViewButton(): Promise<void> {
    return this._enableXmlViewButton.click();
  }

  public async getVisibilityOfDisableXmlViewButton(): Promise<boolean> {
    return this._disableXmlViewButton.isDisplayed();
  }

  public async clickOnDisableXmlViewButton(): Promise<void> {
    return this._disableXmlViewButton.click();
  }

  public async getVisibilityOfEnableDiffViewButton(): Promise<boolean> {
    return this._enableDiffViewButton.isDisplayed();
  }

  public async clickOnEnableDiffViewButton(): Promise<void> {
    return this._enableDiffViewButton.click();
  }

  public async getVisibilityOfDisableDiffViewButton(): Promise<boolean> {
    return this._disableDiffViewButton.isDisplayed();
  }

  public async clickOnDisableDiffViewButton(): Promise<void> {
    return this._disableDiffViewButton.click();
  }

  // Diff View Buttons

  public async getVisibilityOfNewVsOldButton(): Promise<boolean> {
    return this._newVsOldButton.isDisplayed();
  }

  public async clickOnNewVsOldButton(): Promise<void> {
    return this._newVsOldButton.click();
  }

  public async getActiveStateOfNewVsOldButton(): Promise<boolean> {
    const classNames: string = await this._newVsOldButton.getAttribute('class');
    const buttonIsActive: boolean = classNames.includes(this._activeClass);

    return buttonIsActive;
  }

  public async getVisibilityOfOldVsNewButton(): Promise<boolean> {
    return this._oldVsNewButton.isDisplayed();
  }

  public async clickOnOldVsNewButton(): Promise<void> {
    return this._oldVsNewButton.click();
  }

  public async getActiveStateOfOldVsNewButton(): Promise<boolean> {
    const classNames: string = await this._oldVsNewButton.getAttribute('class');
    const buttonIsActive: boolean = classNames.includes(this._activeClass);

    return buttonIsActive;
  }

  public async getVisibilityOfChangeLogButton(): Promise<boolean> {
    return this._changeLogButton.isDisplayed();
  }

  public async clickOnChangeLogButton(): Promise<void> {
    return this._changeLogButton.click();
  }

  public async getActiveStateOfChangeLogButton(): Promise<boolean> {
    const classNames: string = await this._changeLogButton.getAttribute('class');
    const buttonIsActive: boolean = classNames.includes(this._activeClass);

    return buttonIsActive;
  }

  private get _statusBarContainer(): ElementFinder {
    const statusBarByTag: By = by.tagName(this._statusBarTag);

    return element(statusBarByTag);
  }

  private get _leftStatusBarContainer(): ElementFinder {
    const leftContainerById: By = by.id(this._leftStatusBarContainerId);

    return element(leftContainerById);
  }

  private get _centerStatusBarContainer(): ElementFinder {
    const centerContainerById: By = by.id(this._centerStatusBarContainerId);

    return element(centerContainerById);
  }

  private get _rightStatusBarContainer(): ElementFinder {
    const rightContainerById: By = by.id(this._rightStatusBarContainerId);

    return element(rightContainerById);
  }

  private get _enableXmlViewButton(): ElementFinder {
    const showXmlButtonById: By = by.id(this._enableXmlViewButtonId);

    return element(showXmlButtonById);
  }

  private get _disableXmlViewButton(): ElementFinder {
    const disabelXmlViewButtonById: By = by.id(this._disableXmlViewButtonId);

    return element(disabelXmlViewButtonById);
  }

  private get _enableDiffViewButton(): ElementFinder {
    const showDiffButtonById: By = by.id(this._enableDiffViewButtonId);

    return element(showDiffButtonById);
  }

  private get _disableDiffViewButton(): ElementFinder {
    const disableDiffViewButtonById: By = by.id(this._disableDiffViewButtonId);

    return element(disableDiffViewButtonById);
  }

  private get _newVsOldButton(): ElementFinder {
    const newVsOldButtonById: By = by.id(this._newVsOldButtonId);

    return element(newVsOldButtonById);
  }

  private get _oldVsNewButton(): ElementFinder {
    const oldVsNewButtonId: By = by.id(this._oldVsNewButtonId);

    return element(oldVsNewButtonId);
  }

  private get _changeLogButton(): ElementFinder {
    const changeLogButtonById: By = by.id(this._changeLogButtonId);

    return element(changeLogButtonById);
  }
}
