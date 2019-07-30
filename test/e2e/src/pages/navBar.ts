import {ElementFinder, ExpectedConditions, browser, by, element} from 'protractor';

import {By} from 'selenium-webdriver';

export class NavBar {
  private navBarContainerId: string = 'navBarContainer';
  private leftNavBarContainerId: string = 'navBarLeft';
  private centerNavBarContainerId: string = 'navBarCenter';
  private rightNavBarContainerId: string = 'navBarRight';

  private thinkButtonId: string = 'navbar-Think';
  private designButtonId: string = 'navbar-Design';
  private inspectButtonId: string = 'navbar-Inspect';
  private solutionExplorerButtonId: string = 'navbarSolutionExplorerButton';

  private buttonActiveClassName: string = 'button--active';

  public async show(): Promise<void> {
    await browser.wait(ExpectedConditions.visibilityOf(this.navBarContainer), browser.params.defaultTimeoutMS);
  }

  public async getVisibilityOfLeftContainer(): Promise<boolean> {
    return this.leftNavBarContainer.isDisplayed();
  }

  public async getVisibilityOfCenterContainer(): Promise<boolean> {
    return this.centerNavBarContainer.isDisplayed();
  }

  public async getVisibilityOfRightContainer(): Promise<boolean> {
    return this.rightNavBarContainer.isDisplayed();
  }

  public async getVisibilityOfSolutionExplorerButton(): Promise<boolean> {
    return this.solutionExplorerButton.isDisplayed();
  }

  public async getActiveStateOfSolutionExplorerButton(): Promise<boolean> {
    const attributes: string = await this.solutionExplorerButton.getAttribute('class');
    const containsActiveClass: boolean = attributes.includes(this.buttonActiveClassName);

    return containsActiveClass;
  }

  public async clickOnSolutionExplorerButton(): Promise<void> {
    return this.solutionExplorerButton.click();
  }

  public async getVisibilityOfThinkButton(): Promise<boolean> {
    return this.thinkButton.isDisplayed();
  }

  public async getVisibilityOfDesignButton(): Promise<boolean> {
    return this.designButton.isDisplayed();
  }

  public async getVisibilityOfInspectButton(): Promise<boolean> {
    return this.inspectButton.isDisplayed();
  }

  public async clickOnInspectButton(): Promise<void> {
    return this.inspectButton.click();
  }

  private get navBarContainer(): ElementFinder {
    const navBarContainerById: By = by.id(this.navBarContainerId);

    return element(navBarContainerById);
  }

  private get leftNavBarContainer(): ElementFinder {
    const leftNavBarContainerById: By = by.id(this.leftNavBarContainerId);

    return element(leftNavBarContainerById);
  }

  private get centerNavBarContainer(): ElementFinder {
    const centerNavBarContainer: By = by.id(this.centerNavBarContainerId);

    return element(centerNavBarContainer);
  }

  private get rightNavBarContainer(): ElementFinder {
    const rightNavBarContainerById: By = by.id(this.rightNavBarContainerId);

    return element(rightNavBarContainerById);
  }

  private get solutionExplorerButton(): ElementFinder {
    const solutionExlorerButtonById: By = by.id(this.solutionExplorerButtonId);

    return element(solutionExlorerButtonById);
  }

  private get thinkButton(): ElementFinder {
    const thinkButtonById: By = by.id(this.thinkButtonId);

    return element(thinkButtonById);
  }

  private get designButton(): ElementFinder {
    const designButtonById: By = by.id(this.designButtonId);

    return element(designButtonById);
  }

  private get inspectButton(): ElementFinder {
    const inspectButtonById: By = by.id(this.inspectButtonId);

    return element(inspectButtonById);
  }
}
