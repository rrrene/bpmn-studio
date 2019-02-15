import {browser} from 'protractor';

import {DiagramWithUserTask} from './diagrams/diagramWithUserTask';
import {Dashboard} from './pages/dashboard';
import {RouterView} from './pages/routerView';

describe('Dashboard', () => {

  let dashboard: Dashboard;
  let diagram: DiagramWithUserTask;
  let routerView: RouterView;

  const applicationUrl: string = browser.params.aureliaUrl;

  beforeAll(async() => {
    dashboard = new Dashboard(applicationUrl);
    diagram = new DiagramWithUserTask();
    routerView = new RouterView();

    await diagram.deployDiagram();
    await diagram.startProcess();
  });

  afterAll(async() => {

    await diagram.deleteDiagram();
  });

  beforeEach(async() => {
    const routerViewContainer: ElementFinder = general.getRouterViewContainer;
    const visibilityOfRouterViewContainer: Function = expectedConditions.visibilityOf(routerViewContainer);

    await browser.get(aureliaUrl);
    await browser.driver
      .wait(() => {
        browser
          .wait(visibilityOfRouterViewContainer, defaultTimeoutMS);

        return routerViewContainer;
      });

    const dashboardLink: string = dashboard.dashboardLink;

    await browser.get(aureliaUrl + dashboardLink);
    await browser.driver
      .wait(() => {
        browser
          .wait(visibilityOfRouterViewContainer, defaultTimeoutMS);

        return routerViewContainer;
      });
  });

  it('should contain the process list.', async() => {
    const visibilityOfProcessListContainer: boolean = await dashboard.getVisibilityOfProcessListContainer();

    expect(visibilityOfProcessListContainer).toBeTruthy();
  });

  it('should contain recently started process in running section.', async() => {
    const correlationId: string = processModel.getCorrelationId();
    const firstProcessRunningListItemsById: ElementFinder = dashboard.firstProcessRunningListItemsById(correlationId);
    const visibilityOfFirstProcessRunningListItemsById: Function = expectedConditions.visibilityOf(firstProcessRunningListItemsById);

    await browser.driver
      .wait(() => {
        browser
          .wait(visibilityOfFirstProcessRunningListItemsById, defaultTimeoutMS);

        return firstProcessRunningListItemsById;
      });

    const countOfProcessRunningListItemsByCorrelationId: number = await dashboard.countOfProcessRunningListItemsByCorrelationId(correlationId);

    expect(countOfProcessRunningListItemsByCorrelationId).toBe(1);
  });

  it('should be possible to open process model by click on hyperlink in table.', async() => {
    const correlationId: string = processModel.getCorrelationId();
    const hyperlinkOfProcessRunningListItemByCorrelationId: ElementFinder = dashboard.hyperlinkOfProcessRunningListItemByCorrelationId(correlationId);
    const visibilityOfHyperlinkOfProcessRunningListItemByCorrelationId: Function =
      expectedConditions.visibilityOf(hyperlinkOfProcessRunningListItemByCorrelationId);

    await browser.driver
      .wait(() => {
        browser
          .wait(visibilityOfHyperlinkOfProcessRunningListItemByCorrelationId, defaultTimeoutMS);

        return hyperlinkOfProcessRunningListItemByCorrelationId;
      });

    await dashboard.openProcessModelByClickOnModelIdInProcessRunningList(correlationId);

    const processModelUrl: string = ProcessModel.getProcessModelUrl();
    const currentBrowserUrl: string = await browser.getCurrentUrl();

    expect(currentBrowserUrl).toContain(processModelUrl);

  });

  it('should be possible to open user tasks by clicking on the hyperlink in the table.', async() => {
    const correlationId: string = processModel.getCorrelationId();
    const processInstanceId: string = processModel.getProcessInstanceId();
    const hyperlinkOfUserTasksInProcessRunningListItemByCorrelationId: ElementFinder =
      dashboard.hyperlinkOfUserTasksInProcessRunningListItemByCorrelationId(correlationId);
    const visibilityOfHyperlinkOfUserTasksInProcessRunningListItemByCorrelationId: Function =
      expectedConditions.visibilityOf(hyperlinkOfUserTasksInProcessRunningListItemByCorrelationId);

    await browser.driver
      .wait(() => {
        browser
          .wait(visibilityOfHyperlinkOfUserTasksInProcessRunningListItemByCorrelationId, defaultTimeoutMS);
        return hyperlinkOfUserTasksInProcessRunningListItemByCorrelationId;
      });

    await dashboard.openUserTasksByClickOnModelIdInProcessRunningList(correlationId);

    const userTasksUrl: string = ProcessModel.userTasksUrlWithProcessInstance(processInstanceId);
    const currentBrowserUrl: string = await browser.getCurrentUrl();

    expect(currentBrowserUrl).toContain(userTasksUrl);
  });

  it('should contain task list.', async() => {
    const taskListContainer: ElementFinder = dashboard.taskListContainer;
    const visibilityOfTaskListContainer: Function = expectedConditions.visibilityOf(taskListContainer);

    await browser.driver
      .wait(() => {
        browser.wait(visibilityOfTaskListContainer, defaultTimeoutMS);

        return dashboard.taskListContainer;
      });

    const taskListContainerIsDisplayed: boolean = await taskListContainer.isDisplayed();

    expect(taskListContainerIsDisplayed).toBeTruthy();
  });

  // task list section

  it('should contain at least task definition in tasks waiting section.', async() => {
    const firstTaskListItems: ElementFinder = dashboard.firstTaskListItems;
    const visibilityOfFirstTaskListItems: Function = expectedConditions.visibilityOf(firstTaskListItems);

    await browser.driver
      .wait(() => {
        browser
          .wait(visibilityOfFirstTaskListItems, taskListTimeoutMS);
        return firstTaskListItems;
      });

    const countOfTasksWaitingListItems: number = await dashboard.countOfTasksWaitingListItems();

    expect(countOfTasksWaitingListItems).toBeGreaterThanOrEqual(1);
  });

  it('should contain recently started task in tasks waiting section.', async() => {
    const firstTaskWaitingById: ElementFinder = dashboard.firstTaskWaitingById(processModelId);
    const visibilityOfFirstTaskWaitingById: Function = expectedConditions.visibilityOf(firstTaskWaitingById);

    await browser.driver
      .wait(() => {
        browser
          .wait(visibilityOfFirstTaskWaitingById, taskListTimeoutMS);

        return firstTaskWaitingById;
      });

    const countOfTasksWaitingListItemsById: number = await dashboard.countOfTasksWaitingListItemsById(processModelId);

    expect(countOfTasksWaitingListItemsById).toBe(1);
  });

  it('should be possbible to click continue in task waiting section.', async() => {
    const firstTaskWaitingById: ElementFinder = dashboard.firstTaskWaitingById(processModelId);
    const visibilityOfFirstTaskWaitingById: Function = expectedConditions.visibilityOf(firstTaskWaitingById);

    await browser.driver
      .wait(() => {
        browser
          .wait(visibilityOfFirstTaskWaitingById, taskListTimeoutMS);

        return firstTaskWaitingById;
      });

    await dashboard.continueTaskByClickOnButton(processModelId);

    const correlationId: string = processModel.getCorrelationId();
    const processInstanceId: string = processModel.getProcessInstanceId();
    const liveExecutionTrackerUrl: string =
      ProcessModel.liveExecutionTrackerUrl(processModelId, correlationId, processInstanceId);
    const currentBrowserUrl: string = await browser.getCurrentUrl();

    expect(currentBrowserUrl).toContain(liveExecutionTrackerUrl);
  });

  it('should be possible to click continue in an opened user task.', async() => {
    const firstTaskWaitingById: ElementFinder = dashboard.firstTaskWaitingById(processModelId);
    const visibilityOfFirstTaskWaitingById: Function = expectedConditions.visibilityOf(firstTaskWaitingById);

    await browser.driver
      .wait(() => {
        browser
          .wait(visibilityOfFirstTaskWaitingById, taskListTimeoutMS);

        return firstTaskWaitingById;
      });

    await dashboard.continueTaskByClickOnButton(processModelId);

    const dynamicUiWrapperContinueButton: ElementFinder = dashboard.dynamicUiWrapperContinueButton;
    const continueButtonVisible: Function = expectedConditions.visibilityOf(dynamicUiWrapperContinueButton);

    // Wait until view is loaded and button is visible
    await browser.driver
      .wait(() => {
        browser
          .wait(continueButtonVisible, taskListTimeoutMS);

        return dynamicUiWrapperContinueButton;
      });
  });

  it('should be in live execution tracker when click continue in an opened user task.', async() => {
    const firstTaskWaitingById: ElementFinder = dashboard.firstTaskWaitingById(processModelId);
    const visibilityOfFirstTaskWaitingById: Function = expectedConditions.visibilityOf(firstTaskWaitingById);

    await browser.driver
      .wait(() => {
        browser
          .wait(visibilityOfFirstTaskWaitingById, taskListTimeoutMS);

        return firstTaskWaitingById;
      });

    await dashboard.continueTaskByClickOnButton(processModelId);

    const dynamicUiWrapperContinueButton: ElementFinder = dashboard.dynamicUiWrapperContinueButton;
    const continueButtonVisible: Function = expectedConditions.visibilityOf(dynamicUiWrapperContinueButton);

    // Wait until view is loaded and button is visible
    await browser.driver
      .wait(() => {
        browser
          .wait(continueButtonVisible, taskListTimeoutMS);

        return dynamicUiWrapperContinueButton;
      });

    await dashboard.continueUserTaskByClickOnDynamicUiWrapperContinueButton();

    const correlationId: string = processModel.getCorrelationId();
    const processInstanceId: string = processModel.getProcessInstanceId();
    const liveExecutionTrackerUrl: string = ProcessModel.liveExecutionTrackerUrl(processModelId, correlationId, processInstanceId);
    const currentBrowserUrl: string = await browser.getCurrentUrl();

    expect(visibilityOfTaskListContainer).toBeTruthy();
  });
});
