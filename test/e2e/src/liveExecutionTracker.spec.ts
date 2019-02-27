import {browser} from 'protractor';

import {DiagramWithCallActivityAndTasks} from './diagrams/diagramWithCallActivityAndTasks';
import {DiagramWithUserTask} from './diagrams/diagramWithUserTask';
import {DiagramDetail} from './pages/diagramDetail';
import {DiffView} from './pages/diffView';
import {LiveExecutionTracker} from './pages/liveExecutionTracker';
import {RouterView} from './pages/routerView';
import {StatusBar} from './pages/statusBar';

describe('Diff view', () => {

  let routerView: RouterView;
  let targetDiagram: DiagramWithUserTask;
  let diagram: DiagramWithCallActivityAndTasks;
  let liveExecutionTracker: LiveExecutionTracker;

  const applicationUrl: string = browser.params.aureliaUrl;

  beforeAll(async() => {
    routerView = new RouterView();
    targetDiagram = new DiagramWithUserTask();
    diagram = new DiagramWithCallActivityAndTasks(targetDiagram.name);
    liveExecutionTracker = new LiveExecutionTracker(applicationUrl, diagram.correlationId, diagram.name, diagram.processInstanceId);

    await targetDiagram.deployDiagram();
    await diagram.deployDiagram();
    await diagram.startProcess();
  });

  afterAll(async() => {

    await diagram.deleteDiagram();
    await targetDiagram.deleteDiagram();
  });

  beforeEach(async() => {
    await routerView.show();
    await liveExecutionTracker.show();
  });

  it('should display the diagram when on Live Execution Tracker.', async() => {
    const currentBrowserUrl: string = await browser.getCurrentUrl();

    expect(currentBrowserUrl).toContain(liveExecutionTracker.url);

    const visibilityOfDiffViewContainer: boolean = await liveExecutionTracker.getVisibilityOfLiveExecutionTrackerContainer();

    expect(visibilityOfDiffViewContainer).toBeTruthy();
  });

});
