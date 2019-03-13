import {
  browser,
  protractor,
  ProtractorExpectedConditions,
} from 'protractor';

import {SimpleDiagram} from './diagrams/simpleDiagram';
import {DiagramDetail} from './pages/diagramDetail';
import {RouterView} from './pages/routerView';

describe('Diagram Detail', () => {

  let diagramDetail: DiagramDetail;
  let routerView: RouterView;
  let diagram: SimpleDiagram;

  const applicationUrl: string = browser.params.aureliaUrl;
  const defaultTimeoutMS: number = browser.params.defaultTimeoutMS;

  const expectedConditions: ProtractorExpectedConditions = protractor.ExpectedConditions;

  beforeAll(async() => {
    diagram = new SimpleDiagram();
    diagramDetail = new DiagramDetail(applicationUrl, diagram.name);
    routerView = new RouterView();

    await diagram.deployDiagram();
  });

  afterAll(async() => {
    await diagram.deleteDiagram();
  });

  it('should contain the bpmn-io container.', async() => {
    await routerView.show();
    await diagramDetail.show();

    const visibilityOfBpmnIoContainer: boolean = await diagramDetail.getVisibilityOfBpmnIoContainer();

    expect(visibilityOfBpmnIoContainer).toBeTruthy();
  });
});
