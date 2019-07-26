import { browser } from 'protractor';

import { DiagramWithUserTask } from './diagrams/diagramWithUserTask';
import { LETTestDiagram } from './diagrams/letTestDiagram';
import { LiveExecutionTracker } from './pages/liveExecutionTracker';
import { RouterView } from './pages/routerView';

describe('Live Execution Tracker', () => {
  let routerView: RouterView;
  let targetDiagram: DiagramWithUserTask;
  let diagram: LETTestDiagram;
  let liveExecutionTracker: LiveExecutionTracker;

  const applicationUrl: string = browser.params.aureliaUrl;

  beforeAll(async () => {
    routerView = new RouterView();
    targetDiagram = new DiagramWithUserTask();
    diagram = new LETTestDiagram(targetDiagram.name);

    await targetDiagram.deployDiagram();
    await diagram.deployDiagram();
    await diagram.startProcess();
    liveExecutionTracker = new LiveExecutionTracker(
      applicationUrl,
      diagram.correlationId,
      diagram.name,
      diagram.processInstanceId
    );
  });

  afterAll(async () => {
    await diagram.deleteDiagram();
    await targetDiagram.deleteDiagram();
  });

  beforeEach(async () => {
    await routerView.show();
    await liveExecutionTracker.show();
  });

  /**
   * This Tests are currently disabled sicne they produce a faulty behaviour
   * in our build Pipeline.
   * They can be used for local testing nonetheless.
   */

  // it('should display the diagram.', async() => {
  //   const currentBrowserUrl: string = await browser.getCurrentUrl();

  //   expect(currentBrowserUrl).toContain(liveExecutionTracker.url);

  //   const visibilityOfLETViewContainer: boolean = await liveExecutionTracker.getVisibilityOfLiveExecutionTrackerContainer();

  //   expect(visibilityOfLETViewContainer).toBeTruthy();
  // });

  // it('should display the CallActivity with an overlay.', async() => {
  //   const visibilityOfInactiveCallActivityOverlay: boolean = await liveExecutionTracker.getVisibilityOfInactiveCallActivityOverlay();

  //   expect(visibilityOfInactiveCallActivityOverlay).toBeTruthy();
  // });

  // it('should display a suspended EmptyActivity with an overlay.', async() => {
  //   const visibilityOfInactiveCallActivityOverlay: boolean = await liveExecutionTracker.getVisbilityOfEmptyActivityOverlay();

  //   expect(visibilityOfInactiveCallActivityOverlay).toBeTruthy();
  // });
});
