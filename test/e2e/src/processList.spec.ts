import {browser} from 'protractor';

import {DiagramWithUserTask} from './diagrams/diagramWithUserTask';
import {DiagramDetail} from './pages/diagramDetail';
import {ProcessList} from './pages/processList';
import {RouterView} from './pages/routerView';
import {TaskList} from './pages/taskList';

describe('Process List', () => {
  let processList: ProcessList;
  let diagram: DiagramWithUserTask;
  let routerView: RouterView;
  let diagramDetail: DiagramDetail;
  let taskList: TaskList;

  const applicationUrl: string = browser.params.aureliaUrl;

  beforeAll(async () => {
    processList = new ProcessList(applicationUrl);
    diagram = new DiagramWithUserTask();
    routerView = new RouterView();
    diagramDetail = new DiagramDetail(applicationUrl, diagram.name);

    await diagram.deployDiagram();
    await diagram.startProcess();

    taskList = new TaskList(applicationUrl, diagram.processInstanceId);
  });

  afterAll(async () => {
    await diagram.deleteDiagram();
  });

  it('should show the started process.', async () => {
    await routerView.show();
    await processList.show();

    const visibilityOfListEntry: boolean = await processList.getVisibilityOfListEntry(diagram.correlationId);

    expect(visibilityOfListEntry).toBeTruthy();
  });

  // it('should navigate to the `detail view`, after clicking on the corresponding link in the table.', async() => {
  //   await routerView.show();
  //   await processList.show();

  //   await processList.clickOnDiagramDesignLink(diagram.correlationId);

  //   const currentBrowserUrl: string = await browser.getCurrentUrl();
  //   expect(currentBrowserUrl).toContain(diagramDetail.url);

  //   const visibilityOfDiagramDetail: boolean = await diagramDetail.getVisibilityOfDiagramDetailContainer();
  //   expect(visibilityOfDiagramDetail).toBeTruthy();
  // });

  it('should navigate to the `task list`, after clicking on the corresponding link in the table.', async () => {
    await routerView.show();
    await processList.show();

    await processList.clickOnUserTaskLink(diagram.correlationId);

    const currentBrowserUrl: string = await browser.getCurrentUrl();
    expect(currentBrowserUrl).toContain(taskList.urlWithProcessInstanceId);

    const visibilityOfTaskListContainer: boolean = await taskList.getVisibilityOfTaskListContainer();
    expect(visibilityOfTaskListContainer).toBeTruthy();
  });
});
