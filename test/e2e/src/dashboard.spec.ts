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

    await routerView.show();
    await dashboard.show();
  });

  afterAll(async() => {

    await diagram.deleteDiagram();
  });

  // it('should contain the process list.', async() => {
  //   const visibilityOfProcessListContainer: boolean = await dashboard.getVisibilityOfProcessListContainer();

  //   expect(visibilityOfProcessListContainer).toBeTruthy();
  // });

  // it('should contain the task list.', async() => {
  //   const visibilityOfTaskListContainer: boolean = await dashboard.getVisibilityOfTaskListContainer();

  //   expect(visibilityOfTaskListContainer).toBeTruthy();
  // });
});
