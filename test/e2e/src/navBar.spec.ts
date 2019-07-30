import {browser} from 'protractor';

import {Dashboard} from './pages/dashboard';
import {NavBar} from './pages/navBar';
import {RouterView} from './pages/routerView';
import {SolutionExplorer} from './pages/solutionExplorer';

describe('NavBar', () => {
  let dashboard: Dashboard;
  let solutionExplorer: SolutionExplorer;
  let navBar: NavBar;
  let routerView: RouterView;

  const applicationUrl: string = browser.params.aureliaUrl;

  beforeAll(async () => {
    dashboard = new Dashboard(applicationUrl);
    navBar = new NavBar();
    routerView = new RouterView();
    solutionExplorer = new SolutionExplorer();

    await routerView.show();
    await navBar.show();
  });

  it('should contain left container.', async () => {
    const visibilityOfLeftNavBarContainer: boolean = await navBar.getVisibilityOfLeftContainer();

    expect(visibilityOfLeftNavBarContainer).toBeTruthy();
  });

  it('should contain center container.', async () => {
    const visibilityOfCenterNavBarContainer: boolean = await navBar.getVisibilityOfCenterContainer();

    expect(visibilityOfCenterNavBarContainer).toBeTruthy();
  });

  it('should contain right container.', async () => {
    const visibilityOfRightNavBarContainer: boolean = await navBar.getVisibilityOfRightContainer();

    expect(visibilityOfRightNavBarContainer).toBeTruthy();
  });

  it('should contain the `active solution explorer` button.', async () => {
    const visibilityOfSolutionExplorerButton: boolean = await navBar.getVisibilityOfSolutionExplorerButton();

    expect(visibilityOfSolutionExplorerButton).toBeTruthy();

    const solutionExplorerButtonIsActive: boolean = await navBar.getActiveStateOfSolutionExplorerButton();

    expect(solutionExplorerButtonIsActive).toBeTruthy();
  });

  it('should close the solution explorer on button click.', async () => {
    await navBar.clickOnSolutionExplorerButton();
    const visibilityOfSolutionExplorer: boolean = await solutionExplorer.getVisbilityOfSolutionExplorer();

    expect(visibilityOfSolutionExplorer).toBeFalsy();

    const solutionExplorerButtonIsActive: boolean = await navBar.getActiveStateOfSolutionExplorerButton();

    expect(solutionExplorerButtonIsActive).toBeFalsy();
  });

  it('should reopen the solution explorer on button click.', async () => {
    await navBar.clickOnSolutionExplorerButton();

    const visibilityOfSolutionExplorer: boolean = await solutionExplorer.getVisbilityOfSolutionExplorer();

    expect(visibilityOfSolutionExplorer).toBeTruthy();

    const solutionExplorerButtonIsActive: boolean = await navBar.getActiveStateOfSolutionExplorerButton();

    expect(solutionExplorerButtonIsActive).toBeTruthy();
  });

  it('should contain the `think` button.', async () => {
    const visibilityOfThinkButton: boolean = await navBar.getVisibilityOfThinkButton();

    expect(visibilityOfThinkButton).toBeTruthy();
  });

  it('should contain design button.', async () => {
    const visibilityOfDesignButton: boolean = await navBar.getVisibilityOfDesignButton();

    expect(visibilityOfDesignButton).toBeTruthy();
  });

  it('should contain inspect button.', async () => {
    const visibilityOfInspectButton: boolean = await navBar.getVisibilityOfInspectButton();

    expect(visibilityOfInspectButton).toBeTruthy();
  });

  it('should navigate to the dashboard,  after clicking on the `inspect` button.', async () => {
    await routerView.show();
    await navBar.show();

    await navBar.clickOnInspectButton();

    const currentBrowserUrl: string = await browser.getCurrentUrl();

    expect(currentBrowserUrl).toContain(dashboard.url);

    const visibilityOfDashboardContainer: boolean = await dashboard.getVisibilityOfDashboardContainer();
    expect(visibilityOfDashboardContainer).toBeTruthy();
  });
});
