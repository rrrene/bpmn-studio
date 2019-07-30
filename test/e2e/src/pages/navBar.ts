import {ElementFinder, ExpectedConditions, browser, by, element} from 'protractor';

import {By} from 'selenium-webdriver';

export class NavBar {
  private _navBarContainerId: string = 'navBarContainer';
  private _leftNavBarContainerId: string = 'navBarLeft';
  private _centerNavBarContainerId: string = 'navBarCenter';
  private _rightNavBarContainerId: string = 'navBarRight';

  private _thinkButtonId: string = 'navbar-Think';
  private _designButtonId: string = 'navbar-Design';
  private _inspectButtonId: string = 'navbar-Inspect';
  private _solutionExplorerButtonId: string = 'navbarSolutionExplorerButton';

  private _buttonActiveClassName: string = 'button--active';

  public async show(): Promise<void> {
    await browser.wait(ExpectedConditions.visibilityOf(this._navBarContainer), browser.params.defaultTimeoutMS);
  }

  public async getVisibilityOfLeftContainer(): Promise<boolean> {
    return this._leftNavBarContainer.isDisplayed();
  }

  public async getVisibilityOfCenterContainer(): Promise<boolean> {
    return this._centerNavBarContainer.isDisplayed();
  }

  public async getVisibilityOfRightContainer(): Promise<boolean> {
    return this._rightNavBarContainer.isDisplayed();
  }

  public async getVisibilityOfSolutionExplorerButton(): Promise<boolean> {
    return this._solutionExplorerButton.isDisplayed();
  }

  public async getActiveStateOfSolutionExplorerButton(): Promise<boolean> {
    const attributes: string = await this._solutionExplorerButton.getAttribute('class');
    const containsActiveClass: boolean = attributes.includes(this._buttonActiveClassName);

    return containsActiveClass;
  }

  public async clickOnSolutionExplorerButton(): Promise<void> {
    return this._solutionExplorerButton.click();
  }

  public async getVisibilityOfThinkButton(): Promise<boolean> {
    return this._thinkButton.isDisplayed();
  }

  public async getVisibilityOfDesignButton(): Promise<boolean> {
    return this._designButton.isDisplayed();
  }

  public async getVisibilityOfInspectButton(): Promise<boolean> {
    return this._inspectButton.isDisplayed();
  }

  public async clickOnInspectButton(): Promise<void> {
    return this._inspectButton.click();
  }

  private get _navBarContainer(): ElementFinder {
    const navBarContainerById: By = by.id(this._navBarContainerId);

    return element(navBarContainerById);
  }

  private get _leftNavBarContainer(): ElementFinder {
    const leftNavBarContainerById: By = by.id(this._leftNavBarContainerId);

    return element(leftNavBarContainerById);
  }

  private get _centerNavBarContainer(): ElementFinder {
    const centerNavBarContainer: By = by.id(this._centerNavBarContainerId);

    return element(centerNavBarContainer);
  }

  private get _rightNavBarContainer(): ElementFinder {
    const rightNavBarContainerById: By = by.id(this._rightNavBarContainerId);

    return element(rightNavBarContainerById);
  }

  private get _solutionExplorerButton(): ElementFinder {
    const solutionExlorerButtonById: By = by.id(this._solutionExplorerButtonId);

    return element(solutionExlorerButtonById);
  }

  private get _thinkButton(): ElementFinder {
    const thinkButtonById: By = by.id(this._thinkButtonId);

    return element(thinkButtonById);
  }

  private get _designButton(): ElementFinder {
    const designButtonById: By = by.id(this._designButtonId);

    return element(designButtonById);
  }

  private get _inspectButton(): ElementFinder {
    const inspectButtonById: By = by.id(this._inspectButtonId);

    return element(inspectButtonById);
  }
}
