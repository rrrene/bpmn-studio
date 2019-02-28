import {browser} from 'protractor';

import {DiagramWithCallActivityAndTasks} from './diagrams/diagramWithCallActivityAndTasks';
import {DiagramWithUserTask} from './diagrams/diagramWithUserTask';
import {DiagramDetail} from './pages/diagramDetail';
import {DiffView} from './pages/diffView';
import {LiveExecutionTracker} from './pages/liveExecutionTracker';
import {RouterView} from './pages/routerView';
import {StatusBar} from './pages/statusBar';

describe('Live Execution Tracker', () => {

  let routerView: RouterView;
  let targetDiagram: DiagramWithUserTask;
  let diagram: DiagramWithCallActivityAndTasks;
  let liveExecutionTracker: LiveExecutionTracker;

  const applicationUrl: string = browser.params.aureliaUrl;

  beforeAll(async() => {
    routerView = new RouterView();
    targetDiagram = new DiagramWithUserTask();
    diagram = new DiagramWithCallActivityAndTasks(targetDiagram.name);

    await targetDiagram.deployDiagram();
    await diagram.deployDiagram();
    await diagram.startProcess();
    liveExecutionTracker = new LiveExecutionTracker(applicationUrl, diagram.correlationId, diagram.name, diagram.processInstanceId);
  });

  afterAll(async() => {

    await diagram.deleteDiagram();
    await targetDiagram.deleteDiagram();
  });

  beforeEach(async() => {
    await routerView.show();
    await liveExecutionTracker.show();
  });

  it('should display the diagram.', async() => {
    const currentBrowserUrl: string = await browser.getCurrentUrl();

    expect(currentBrowserUrl).toContain(liveExecutionTracker.url);

    const visibilityOfLETViewContainer: boolean = await liveExecutionTracker.getVisibilityOfLiveExecutionTrackerContainer();

    expect(visibilityOfLETViewContainer).toBeTruthy();
  });

  it('should display the CallActivity with an overlay.', async() => {
    const currentBrowserUrl: string = await browser.getCurrentUrl();

    expect(currentBrowserUrl).toContain(liveExecutionTracker.url);

    const visibilityOfInactiveCallActivityOverlay: boolean = await liveExecutionTracker.getVisibilityOfInactiveCallActivityOverlay();

    expect(visibilityOfInactiveCallActivityOverlay).toBeTruthy();
  });

});
