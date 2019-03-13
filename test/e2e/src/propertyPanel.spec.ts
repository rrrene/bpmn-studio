import {browser} from 'protractor';

import {PropertyPanelTestDiagram} from './diagrams/propertyPanelTestDiagram';
import {DiagramDetail} from './pages/diagramDetail';
import {PropertyPanel} from './pages/propertyPanel';
import {RouterView} from './pages/routerView';

describe('Property Panel', () => {

  let diagram: PropertyPanelTestDiagram;
  let routerView: RouterView;
  let diagramDetail: DiagramDetail;
  let propertyPanel: PropertyPanel;

  const applicationUrl: string = browser.params.aureliaUrl;

  beforeAll(async() => {
    diagram = new PropertyPanelTestDiagram();
    routerView = new RouterView();
    diagramDetail = new DiagramDetail(applicationUrl, diagram.name);
    propertyPanel = new PropertyPanel();

    await diagram.deployDiagram();

    await routerView.show();
    await diagramDetail.show();
    await propertyPanel.show();
  });

  afterAll(async() => {
    await diagram.deleteDiagram();
  });

  it('should show general basics section after loading of the diagram.', async() => {
    const visibilityOfGeneralBasicsSection: boolean = await propertyPanel.getVisibilityOfGeneralBasicsSection();

    expect(visibilityOfGeneralBasicsSection).toBeTruthy();
  });

  it('should show general basics section after click on StartEvent.', async() => {
    await diagramDetail.clickOnElement(diagram.startEventId);

    const visibilityOfGeneralBasicsSection: boolean = await propertyPanel.getVisibilityOfGeneralBasicsSection();

    expect(visibilityOfGeneralBasicsSection).toBeTruthy();
  });

  it('should show CallActivity section after click on CallActivity.', async() => {
    await diagramDetail.clickOnElement(diagram.callActivityId);

    const visbilityOfCallActivitySection: boolean = await propertyPanel.getVisibilityOfCallActivitySection();

    expect(visbilityOfCallActivitySection).toBeTruthy();
  });

  it('should show ConditionalEvent section after click on ConditionalEvent.', async() => {
    await diagramDetail.clickOnElement(diagram.conditionalBoundaryEventId);

    const visibilityOfConditionalEventSection: boolean = await propertyPanel.getVisibilityOfConditionalEventSection();

    expect(visibilityOfConditionalEventSection).toBeTruthy();
  });

  it('should show ErrorEvent section after click on ErrorEvent.', async() => {
    await diagramDetail.clickOnElement(diagram.errorBoundaryEventId);

    const visbilityOfErrorEventSection: boolean = await propertyPanel.getVisibilityOfErrorEventSection();

    expect(visbilityOfErrorEventSection).toBeTruthy();
  });

  it('should show EscalationEvent section after click on EscalationEvent.', async() => {
    await diagramDetail.clickOnElement(diagram.intermediateEscalationEventId);

    const visbilityOfEscalationEventSection: boolean = await propertyPanel.getVisibilityOfEscalationEventSection();

    expect(visbilityOfEscalationEventSection).toBeTruthy();
  });

  it('should show MessageEvent section after click on MessageCatchEvent.', async() => {
    await diagramDetail.clickOnElement(diagram.intermediateMessageCatchEventId);

    const visibilityOfMessageEventSection: boolean = await propertyPanel.getVisibilityOfMessageEventSection();

    expect(visibilityOfMessageEventSection).toBeTruthy();
  });

  it('should show MessageEvent section after click on MessageSendEvent.', async() => {
    await diagramDetail.clickOnElement(diagram.intermediateMessageSendEventId);

    const visibilityOfMessageEventSection: boolean = await propertyPanel.getVisibilityOfMessageEventSection();

    expect(visibilityOfMessageEventSection).toBeTruthy();
  });

  it('should show MessageEvent section after click on MessageStartEvent.', async() => {
    await diagramDetail.clickOnElement(diagram.messageStartEventId);

    const visibilityOfMessageEventSection: boolean = await propertyPanel.getVisibilityOfMessageEventSection();

    expect(visibilityOfMessageEventSection).toBeTruthy();
  });

  it('should show MessageTask section after click on MessageReceiveTask.', async() => {
    await diagramDetail.clickOnElement(diagram.messageReceiveTaskId);

    const visibilityOfMessageTaskSection: boolean = await propertyPanel.getVisibilityOfMessageTaskSection();

    expect(visibilityOfMessageTaskSection).toBeTruthy();
  });

  it('should show MessageTask section after click on MessageSendTask.', async() => {
    await diagramDetail.clickOnElement(diagram.messageSendTaskId);

    const visibilityOfMessageTaskSection: boolean = await propertyPanel.getVisibilityOfMessageTaskSection();

    expect(visibilityOfMessageTaskSection).toBeTruthy();
  });

  it('should show Process section after click on Collaboration.', async() => {
    await diagramDetail.clickOnElement(diagram.collaborationId);

    const visbilityOfProcessSection: boolean = await propertyPanel.getVisibilityOfGeneralProcessSection();

    expect(visbilityOfProcessSection).toBeTruthy();
  });

  it('should show ScriptTask section after click on ScriptTask.', async() => {
    await diagramDetail.clickOnElement(diagram.scriptTaskId);

    const visbilityOfScriptTaskSection: boolean = await propertyPanel.getVisibilityOfScriptTaskSection();

    expect(visbilityOfScriptTaskSection).toBeTruthy();
  });

  it('should show ServiceTask section after click on ScriptTask.', async() => {
    await diagramDetail.clickOnElement(diagram.serviceTaskId);

    const visbilityOfServiceTaskSection: boolean = await propertyPanel.getVisbilityOfServiceTaskSection();

    expect(visbilityOfServiceTaskSection).toBeTruthy();
  });

  it('should show SignalEvent section after click on SignalStartEvent.', async() => {
    await diagramDetail.clickOnElement(diagram.signalStartEventId);

    const visbilityOfSignalEventSection: boolean = await propertyPanel.getVisbilityOfSignalEventSection();

    expect(visbilityOfSignalEventSection).toBeTruthy();
  });

  it('should show SignalEvent section after click on intermediate SignalSendEvent.', async() => {
    await diagramDetail.clickOnElement(diagram.intermediateSignalSendEventId);

    const visbilityOfSignalEventSection: boolean = await propertyPanel.getVisbilityOfSignalEventSection();

    expect(visbilityOfSignalEventSection).toBeTruthy();
  });

  it('should show SignalEvent section after click on intermediate SignalCatchEvent.', async() => {
    await diagramDetail.clickOnElement(diagram.intermediateSignalCatchEventId);

    const visbilityOfSignalEventSection: boolean = await propertyPanel.getVisbilityOfSignalEventSection();

    expect(visbilityOfSignalEventSection).toBeTruthy();
  });

  it('should show TimerEvent section after click on TimerStartEvent.', async() => {
    await diagramDetail.clickOnElement(diagram.timerStartEventId);

    const visbilityOfTimerEventSection: boolean = await propertyPanel.getVisbilityOfTimerEventSection();

    expect(visbilityOfTimerEventSection).toBeTruthy();
  });

  it('should show TimerEvent section after click on intermediate TimerEvent.', async() => {
    await diagramDetail.clickOnElement(diagram.intermediateTimerEventId);

    const visbilityOfTimerEventSection: boolean = await propertyPanel.getVisbilityOfTimerEventSection();

    expect(visbilityOfTimerEventSection).toBeTruthy();
  });

  it('should show extensions basic section after click on any element except Collaboration.', async() => {
    await diagramDetail.clickOnElement(diagram.startEventId);

    let visibilityOfExstensionsSection: boolean = await propertyPanel.getVisbilityOfExtensionsBasicSection();

    expect(visibilityOfExstensionsSection).toBeTruthy();
    await diagramDetail.clickOnElement(diagram.callActivityId);

    visibilityOfExstensionsSection = await propertyPanel.getVisbilityOfExtensionsBasicSection();

    expect(visibilityOfExstensionsSection).toBeTruthy();
    await diagramDetail.clickOnElement(diagram.errorBoundaryEventId);

    visibilityOfExstensionsSection = await propertyPanel.getVisbilityOfExtensionsBasicSection();

    expect(visibilityOfExstensionsSection).toBeTruthy();
    await diagramDetail.clickOnElement(diagram.conditionalBoundaryEventId);

    visibilityOfExstensionsSection = await propertyPanel.getVisbilityOfExtensionsBasicSection();

    expect(visibilityOfExstensionsSection).toBeTruthy();
    await diagramDetail.clickOnElement(diagram.intermediateEscalationEventId);

    visibilityOfExstensionsSection = await propertyPanel.getVisbilityOfExtensionsBasicSection();

    expect(visibilityOfExstensionsSection).toBeTruthy();
    await diagramDetail.clickOnElement(diagram.messageStartEventId);

    visibilityOfExstensionsSection = await propertyPanel.getVisbilityOfExtensionsBasicSection();

    expect(visibilityOfExstensionsSection).toBeTruthy();
    await diagramDetail.clickOnElement(diagram.messageSendTaskId);

    visibilityOfExstensionsSection = await propertyPanel.getVisbilityOfExtensionsBasicSection();

    expect(visibilityOfExstensionsSection).toBeTruthy();
    await diagramDetail.clickOnElement(diagram.messageReceiveTaskId);

    visibilityOfExstensionsSection = await propertyPanel.getVisbilityOfExtensionsBasicSection();

    expect(visibilityOfExstensionsSection).toBeTruthy();
    await diagramDetail.clickOnElement(diagram.signalStartEventId);

    visibilityOfExstensionsSection = await propertyPanel.getVisbilityOfExtensionsBasicSection();

    expect(visibilityOfExstensionsSection).toBeTruthy();
    await diagramDetail.clickOnElement(diagram.scriptTaskId);

    visibilityOfExstensionsSection = await propertyPanel.getVisbilityOfExtensionsBasicSection();

    expect(visibilityOfExstensionsSection).toBeTruthy();
    await diagramDetail.clickOnElement(diagram.serviceTaskId);

    visibilityOfExstensionsSection = await propertyPanel.getVisbilityOfExtensionsBasicSection();

    expect(visibilityOfExstensionsSection).toBeTruthy();
    await diagramDetail.clickOnElement(diagram.endEventId);

    visibilityOfExstensionsSection = await propertyPanel.getVisbilityOfExtensionsBasicSection();

    expect(visibilityOfExstensionsSection).toBeTruthy();
    await diagramDetail.clickOnElement(diagram.intermediateMessageCatchEventId);

    visibilityOfExstensionsSection = await propertyPanel.getVisbilityOfExtensionsBasicSection();

    expect(visibilityOfExstensionsSection).toBeTruthy();
    await diagramDetail.clickOnElement(diagram.intermediateMessageSendEventId);

    visibilityOfExstensionsSection = await propertyPanel.getVisbilityOfExtensionsBasicSection();

    expect(visibilityOfExstensionsSection).toBeTruthy();
    await diagramDetail.clickOnElement(diagram.intermediateSignalCatchEventId);

    visibilityOfExstensionsSection = await propertyPanel.getVisbilityOfExtensionsBasicSection();

    expect(visibilityOfExstensionsSection).toBeTruthy();
    await diagramDetail.clickOnElement(diagram.intermediateSignalSendEventId);

    visibilityOfExstensionsSection = await propertyPanel.getVisbilityOfExtensionsBasicSection();

    expect(visibilityOfExstensionsSection).toBeTruthy();
  });

  it('should not show basic extensions section after click on Collaboration.', async() => {
    await diagramDetail.clickOnElement(diagram.collaborationId);

    const visibilityOfExstensionsSection: boolean = await propertyPanel.getPresenceOfExtensionsBasicSection();

    expect(visibilityOfExstensionsSection).toBeFalsy();
  });

  it('should show process extensions section after click on Collaboration.', async() => {
    await diagramDetail.clickOnElement(diagram.collaborationId);

    const visbilityOfProcessExtensionsSection: boolean = await propertyPanel.getVisbilityOfExtensionsProcessSection();

    expect(visbilityOfProcessExtensionsSection).toBeTruthy();
  });
});
