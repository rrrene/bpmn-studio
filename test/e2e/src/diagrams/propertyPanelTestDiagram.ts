import { browser } from 'protractor';
import { HttpClient } from 'protractor-http-client';

import { IRequestHeaders, IRequestPayload } from '../contracts/index';

export class PropertyPanelTestDiagram {
  public name: string = 'PPTest';

  public collaborationId: string = 'PPTest_Collaboration';
  public participantId: string = 'PPTest_Participant';
  public startEventId: string = 'PPTest_StartEvent';
  public endEventId: string = 'PPTest_EndEvent';
  public scriptTaskId: string = 'PPTest_Task_Script';
  public messageReceiveTaskId: string = 'PPTest_Task_MessageReceive';
  public messageSendTaskId: string = 'PPTest_Task_MessageSend';
  public serviceTaskId: string = 'PPTest_Task_Service';
  public callActivityId: string = 'PPTest_Task_CallActivity';
  public intermediateTimerEventId: string = 'PPTest_IntermediateThrowEvent_Timer';
  public intermediateMessageCatchEventId: string = 'PPTest_IntermediateThrowEvent_Message_Catch';
  public intermediateMessageSendEventId: string = 'PPTest_IntermediateThrowEvent_Message_Send';
  public intermediateEscalationEventId: string = 'PPTest_IntermediateThrowEvent_Escalation';
  public intermediateSignalCatchEventId: string = 'PPTest_IntermediateThrowEvent_Signal_Catch';
  public intermediateSignalSendEventId: string = 'PPTest_IntermediateThrowEvent_Signal_Send';
  public errorBoundaryEventId: string = 'PPTest_BoundaryEvent_Error';
  public conditionalBoundaryEventId: string = 'PPTest_BoundaryEvent_Conditional';
  public timerStartEventId: string = 'PPTest_StartEvent_Timer';
  public signalStartEventId: string = 'PPTest_StartEvent_Signal';
  public messageStartEventId: string = 'PPTest_StartEvent_Message';

  // Define Instances
  private _processEngineUrl: string = browser.params.processEngineUrl;
  private _http: HttpClient = new HttpClient(this._processEngineUrl);
  private _processEngineActionTimeout: number = browser.params.processEngineActionTimeout;

  public async deployDiagram(): Promise<void> {
    const requestDestination: string = `/api/management/v1/process_models/${this.name}/update`;
    const requestPayload: IRequestPayload = {
      xml: `<?xml version="1.0" encoding="UTF-8"?>
      <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                        xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                        xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                        xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                        xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
                        id="Definition_1" targetNamespace="http://bpmn.io/schema/bpmn"
                        exporter="Camunda Modeler" exporterVersion="1.11.3">
        <bpmn:collaboration id="PPTest_Collaboration" name="">
          <bpmn:participant id="PPTest_Participant" name="PPTest" processRef="PPTest" />
        </bpmn:collaboration>
        <bpmn:process id="PPTest" name="PPTest" isExecutable="true">
          <bpmn:laneSet>
            <bpmn:lane id="Lane_1xzf0d3" name="Lane">
              <bpmn:flowNodeRef>PPTest_StartEvent</bpmn:flowNodeRef>
              <bpmn:flowNodeRef>PPTest_EndEvent</bpmn:flowNodeRef>
              <bpmn:flowNodeRef>PPTest_Task_Script</bpmn:flowNodeRef>
              <bpmn:flowNodeRef>PPTest_Task_MessageReceive</bpmn:flowNodeRef>
              <bpmn:flowNodeRef>PPTest_Task_MessageSend</bpmn:flowNodeRef>
              <bpmn:flowNodeRef>PPTest_Task_Service</bpmn:flowNodeRef>
              <bpmn:flowNodeRef>PPTest_Task_CallActivity</bpmn:flowNodeRef>
              <bpmn:flowNodeRef>PPTest_IntermediateThrowEvent_Timer</bpmn:flowNodeRef>
              <bpmn:flowNodeRef>PPTest_IntermediateThrowEvent_Message_Catch</bpmn:flowNodeRef>
              <bpmn:flowNodeRef>PPTest_IntermediateThrowEvent_Message_Send</bpmn:flowNodeRef>
              <bpmn:flowNodeRef>PPTest_IntermediateThrowEvent_Escalation</bpmn:flowNodeRef>
              <bpmn:flowNodeRef>PPTest_IntermediateThrowEvent_Signal_Catch</bpmn:flowNodeRef>
              <bpmn:flowNodeRef>PPTest_IntermediateThrowEvent_Signal_Send</bpmn:flowNodeRef>
              <bpmn:flowNodeRef>PPTest_StartEvent_Timer</bpmn:flowNodeRef>
              <bpmn:flowNodeRef>PPTest_StartEvent_Signal</bpmn:flowNodeRef>
              <bpmn:flowNodeRef>PPTest_StartEvent_Message</bpmn:flowNodeRef>
              <bpmn:flowNodeRef>PPTest_BoundaryEvent_Conditional</bpmn:flowNodeRef>
              <bpmn:flowNodeRef>PPTest_BoundaryEvent_Error</bpmn:flowNodeRef>
            </bpmn:lane>
          </bpmn:laneSet>
          <bpmn:startEvent id="PPTest_StartEvent" name="Start Event">
            <bpmn:outgoing>SequenceFlow_09xww6m</bpmn:outgoing>
          </bpmn:startEvent>
          <bpmn:sequenceFlow id="SequenceFlow_09xww6m" sourceRef="PPTest_StartEvent" targetRef="PPTest_Task_Script" />
          <bpmn:sequenceFlow id="SequenceFlow_0l5hxrn" sourceRef="PPTest_Task_Script" targetRef="PPTest_Task_MessageReceive" />
          <bpmn:sequenceFlow id="SequenceFlow_1ue8q8l" sourceRef="PPTest_Task_MessageReceive" targetRef="PPTest_Task_MessageSend" />
          <bpmn:sequenceFlow id="SequenceFlow_00zb8fl" sourceRef="PPTest_Task_MessageSend" targetRef="PPTest_Task_Service" />
          <bpmn:sequenceFlow id="SequenceFlow_04i2z89" sourceRef="PPTest_Task_Service" targetRef="PPTest_Task_CallActivity" />
          <bpmn:sequenceFlow id="SequenceFlow_053sdae" sourceRef="PPTest_Task_CallActivity" targetRef="PPTest_EndEvent" />
          <bpmn:endEvent id="PPTest_EndEvent" name="End Event">
            <bpmn:incoming>SequenceFlow_053sdae</bpmn:incoming>
          </bpmn:endEvent>
          <bpmn:scriptTask id="PPTest_Task_Script" name="">
            <bpmn:incoming>SequenceFlow_09xww6m</bpmn:incoming>
            <bpmn:incoming>SequenceFlow_1d5e2h0</bpmn:incoming>
            <bpmn:incoming>SequenceFlow_0swhu74</bpmn:incoming>
            <bpmn:outgoing>SequenceFlow_0l5hxrn</bpmn:outgoing>
            <bpmn:script>aowifhawoi</bpmn:script>
          </bpmn:scriptTask>
          <bpmn:receiveTask id="PPTest_Task_MessageReceive" name="" messageRef="Message_3Ythx4Yn">
            <bpmn:incoming>SequenceFlow_0l5hxrn</bpmn:incoming>
            <bpmn:incoming>SequenceFlow_0qt5fqp</bpmn:incoming>
            <bpmn:incoming>SequenceFlow_1ch4uf2</bpmn:incoming>
            <bpmn:outgoing>SequenceFlow_1ue8q8l</bpmn:outgoing>
          </bpmn:receiveTask>
          <bpmn:sendTask id="PPTest_Task_MessageSend" name="" messageRef="Message_3Ythx4Yn">
            <bpmn:incoming>SequenceFlow_1ue8q8l</bpmn:incoming>
            <bpmn:incoming>SequenceFlow_1x63ool</bpmn:incoming>
            <bpmn:incoming>SequenceFlow_0jb75u2</bpmn:incoming>
            <bpmn:outgoing>SequenceFlow_00zb8fl</bpmn:outgoing>
          </bpmn:sendTask>
          <bpmn:serviceTask id="PPTest_Task_Service">
            <bpmn:extensionElements>
              <camunda:properties />
              <camunda:properties />
              <camunda:properties />
            </bpmn:extensionElements>
            <bpmn:incoming>SequenceFlow_00zb8fl</bpmn:incoming>
            <bpmn:incoming>SequenceFlow_0rhetgr</bpmn:incoming>
            <bpmn:incoming>SequenceFlow_12o2b6h</bpmn:incoming>
            <bpmn:outgoing>SequenceFlow_04i2z89</bpmn:outgoing>
          </bpmn:serviceTask>
          <bpmn:callActivity id="PPTest_Task_CallActivity" name="">
            <bpmn:incoming>SequenceFlow_04i2z89</bpmn:incoming>
            <bpmn:incoming>SequenceFlow_1j5zur3</bpmn:incoming>
            <bpmn:outgoing>SequenceFlow_053sdae</bpmn:outgoing>
          </bpmn:callActivity>
          <bpmn:intermediateCatchEvent id="PPTest_IntermediateThrowEvent_Timer">
            <bpmn:outgoing>SequenceFlow_1d5e2h0</bpmn:outgoing>
            <bpmn:timerEventDefinition>
              <bpmn:timeDate xsi:type="bpmn:tFormalExpression" />
            </bpmn:timerEventDefinition>
          </bpmn:intermediateCatchEvent>
          <bpmn:sequenceFlow id="SequenceFlow_1d5e2h0" sourceRef="PPTest_IntermediateThrowEvent_Timer" targetRef="PPTest_Task_Script" />
          <bpmn:intermediateCatchEvent id="PPTest_IntermediateThrowEvent_Message_Catch">
            <bpmn:outgoing>SequenceFlow_0qt5fqp</bpmn:outgoing>
            <bpmn:messageEventDefinition messageRef="Message_3Ythx4Yn" />
          </bpmn:intermediateCatchEvent>
          <bpmn:sequenceFlow id="SequenceFlow_0qt5fqp" sourceRef="PPTest_IntermediateThrowEvent_Message_Catch"
                             targetRef="PPTest_Task_MessageReceive" />
          <bpmn:intermediateThrowEvent id="PPTest_IntermediateThrowEvent_Message_Send">
            <bpmn:outgoing>SequenceFlow_1x63ool</bpmn:outgoing>
            <bpmn:messageEventDefinition messageRef="Message_3Ythx4Yn" />
          </bpmn:intermediateThrowEvent>
          <bpmn:sequenceFlow id="SequenceFlow_1x63ool" sourceRef="PPTest_IntermediateThrowEvent_Message_Send" targetRef="PPTest_Task_MessageSend" />
          <bpmn:intermediateThrowEvent id="PPTest_IntermediateThrowEvent_Escalation" name="">
            <bpmn:outgoing>SequenceFlow_0rhetgr</bpmn:outgoing>
            <bpmn:escalationEventDefinition escalationRef="Escalation_x57IyDG4" />
          </bpmn:intermediateThrowEvent>
          <bpmn:sequenceFlow id="SequenceFlow_0rhetgr" sourceRef="PPTest_IntermediateThrowEvent_Escalation" targetRef="PPTest_Task_Service" />
          <bpmn:intermediateCatchEvent id="PPTest_IntermediateThrowEvent_Signal_Catch">
            <bpmn:outgoing>SequenceFlow_1j5zur3</bpmn:outgoing>
            <bpmn:signalEventDefinition signalRef="Signal_i7DAygfG" />
          </bpmn:intermediateCatchEvent>
          <bpmn:sequenceFlow id="SequenceFlow_1j5zur3" sourceRef="PPTest_IntermediateThrowEvent_Signal_Catch" targetRef="PPTest_Task_CallActivity" />
          <bpmn:intermediateThrowEvent id="PPTest_IntermediateThrowEvent_Signal_Send" name="">
            <bpmn:outgoing>SequenceFlow_0swhu74</bpmn:outgoing>
            <bpmn:signalEventDefinition signalRef="Signal_i7DAygfG" />
          </bpmn:intermediateThrowEvent>
          <bpmn:sequenceFlow id="SequenceFlow_0swhu74" sourceRef="PPTest_IntermediateThrowEvent_Signal_Send" targetRef="PPTest_Task_Script" />
          <bpmn:startEvent id="PPTest_StartEvent_Timer">
            <bpmn:outgoing>SequenceFlow_1ch4uf2</bpmn:outgoing>
            <bpmn:timerEventDefinition />
          </bpmn:startEvent>
          <bpmn:sequenceFlow id="SequenceFlow_1ch4uf2" sourceRef="PPTest_StartEvent_Timer" targetRef="PPTest_Task_MessageReceive" />
          <bpmn:startEvent id="PPTest_StartEvent_Signal">
            <bpmn:outgoing>SequenceFlow_0jb75u2</bpmn:outgoing>
            <bpmn:signalEventDefinition />
          </bpmn:startEvent>
          <bpmn:sequenceFlow id="SequenceFlow_0jb75u2" sourceRef="PPTest_StartEvent_Signal" targetRef="PPTest_Task_MessageSend" />
          <bpmn:startEvent id="PPTest_StartEvent_Message">
            <bpmn:outgoing>SequenceFlow_12o2b6h</bpmn:outgoing>
            <bpmn:messageEventDefinition />
          </bpmn:startEvent>
          <bpmn:sequenceFlow id="SequenceFlow_12o2b6h" sourceRef="PPTest_StartEvent_Message" targetRef="PPTest_Task_Service" />
          <bpmn:boundaryEvent id="PPTest_BoundaryEvent_Conditional" attachedToRef="PPTest_Task_Script">
            <bpmn:conditionalEventDefinition>
              <bpmn:condition xsi:type="bpmn:tFormalExpression" />
            </bpmn:conditionalEventDefinition>
          </bpmn:boundaryEvent>
          <bpmn:boundaryEvent id="PPTest_BoundaryEvent_Error" attachedToRef="PPTest_Task_MessageReceive">
            <bpmn:errorEventDefinition />
          </bpmn:boundaryEvent>
        </bpmn:process>
        <bpmn:message id="Message_3Ythx4Yn" name="Message Name" />
        <bpmn:escalation id="Escalation_x57IyDG4" name="Escalation Name" />
        <bpmn:signal id="Signal_i7DAygfG" name="Signal Name" />
        <bpmndi:BPMNDiagram id="BPMNDiagram_1">
          <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="PPTest_Collaboration">
            <bpmndi:BPMNShape id="Participant_0px403d_di" bpmnElement="PPTest_Participant">
              <dc:Bounds x="-306" y="-2" width="1218" height="299" />
            </bpmndi:BPMNShape>
            <bpmndi:BPMNShape id="Lane_1xzf0d3_di" bpmnElement="Lane_1xzf0d3">
              <dc:Bounds x="-276" y="-2" width="1188" height="299" />
            </bpmndi:BPMNShape>
            <bpmndi:BPMNShape id="StartEvent_1mox3jl_di" bpmnElement="PPTest_StartEvent">
              <dc:Bounds x="-218" y="125" width="36" height="36" />
              <bpmndi:BPMNLabel>
                <dc:Bounds x="-227" y="161" width="55" height="14" />
              </bpmndi:BPMNLabel>
            </bpmndi:BPMNShape>
            <bpmndi:BPMNShape id="EndEvent_0eie6q6_di" bpmnElement="PPTest_EndEvent">
              <dc:Bounds x="858" y="125" width="36" height="36" />
              <bpmndi:BPMNLabel>
                <dc:Bounds x="851" y="161" width="51" height="14" />
              </bpmndi:BPMNLabel>
            </bpmndi:BPMNShape>
            <bpmndi:BPMNEdge id="SequenceFlow_09xww6m_di" bpmnElement="SequenceFlow_09xww6m">
              <di:waypoint x="-182" y="143" />
              <di:waypoint x="-95" y="143" />
            </bpmndi:BPMNEdge>
            <bpmndi:BPMNShape id="ScriptTask_1a3j0rr_di" bpmnElement="PPTest_Task_Script">
              <dc:Bounds x="-95" y="103" width="100" height="80" />
            </bpmndi:BPMNShape>
            <bpmndi:BPMNEdge id="SequenceFlow_0l5hxrn_di" bpmnElement="SequenceFlow_0l5hxrn">
              <di:waypoint x="5" y="143" />
              <di:waypoint x="97" y="143" />
            </bpmndi:BPMNEdge>
            <bpmndi:BPMNEdge id="SequenceFlow_1ue8q8l_di" bpmnElement="SequenceFlow_1ue8q8l">
              <di:waypoint x="197" y="143" />
              <di:waypoint x="289" y="143" />
            </bpmndi:BPMNEdge>
            <bpmndi:BPMNEdge id="SequenceFlow_00zb8fl_di" bpmnElement="SequenceFlow_00zb8fl">
              <di:waypoint x="389" y="143" />
              <di:waypoint x="481" y="143" />
            </bpmndi:BPMNEdge>
            <bpmndi:BPMNEdge id="SequenceFlow_04i2z89_di" bpmnElement="SequenceFlow_04i2z89">
              <di:waypoint x="581" y="143" />
              <di:waypoint x="673" y="143" />
            </bpmndi:BPMNEdge>
            <bpmndi:BPMNEdge id="SequenceFlow_053sdae_di" bpmnElement="SequenceFlow_053sdae">
              <di:waypoint x="773" y="143" />
              <di:waypoint x="858" y="143" />
            </bpmndi:BPMNEdge>
            <bpmndi:BPMNShape id="ReceiveTask_11pt3l4_di" bpmnElement="PPTest_Task_MessageReceive">
              <dc:Bounds x="97" y="103" width="100" height="80" />
            </bpmndi:BPMNShape>
            <bpmndi:BPMNShape id="SendTask_1s2poxu_di" bpmnElement="PPTest_Task_MessageSend">
              <dc:Bounds x="289" y="103" width="100" height="80" />
            </bpmndi:BPMNShape>
            <bpmndi:BPMNShape id="ServiceTask_04h5hnm_di" bpmnElement="PPTest_Task_Service">
              <dc:Bounds x="481" y="103" width="100" height="80" />
            </bpmndi:BPMNShape>
            <bpmndi:BPMNShape id="CallActivity_0e8q8do_di" bpmnElement="PPTest_Task_CallActivity">
              <dc:Bounds x="673" y="103" width="100" height="80" />
            </bpmndi:BPMNShape>
            <bpmndi:BPMNShape id="IntermediateCatchEvent_0xypr88_di" bpmnElement="PPTest_IntermediateThrowEvent_Message_Catch">
              <dc:Bounds x="19" y="218" width="36" height="36" />
            </bpmndi:BPMNShape>
            <bpmndi:BPMNShape id="IntermediateThrowEvent_1jdlrjo_di" bpmnElement="PPTest_IntermediateThrowEvent_Message_Send">
              <dc:Bounds x="224" y="218" width="36" height="36" />
            </bpmndi:BPMNShape>
            <bpmndi:BPMNShape id="IntermediateCatchEvent_1c3tppg_di" bpmnElement="PPTest_IntermediateThrowEvent_Timer">
              <dc:Bounds x="-218" y="218" width="36" height="36" />
            </bpmndi:BPMNShape>
            <bpmndi:BPMNShape id="IntermediateThrowEvent_04vq9qm_di" bpmnElement="PPTest_IntermediateThrowEvent_Escalation">
              <dc:Bounds x="413" y="218" width="36" height="36" />
            </bpmndi:BPMNShape>
            <bpmndi:BPMNShape id="IntermediateCatchEvent_15px35x_di" bpmnElement="PPTest_IntermediateThrowEvent_Signal_Catch">
              <dc:Bounds x="606" y="218" width="36" height="36" />
            </bpmndi:BPMNShape>
            <bpmndi:BPMNEdge id="SequenceFlow_1d5e2h0_di" bpmnElement="SequenceFlow_1d5e2h0">
              <di:waypoint x="-182" y="236" />
              <di:waypoint x="-45" y="236" />
              <di:waypoint x="-45" y="183" />
            </bpmndi:BPMNEdge>
            <bpmndi:BPMNEdge id="SequenceFlow_0qt5fqp_di" bpmnElement="SequenceFlow_0qt5fqp">
              <di:waypoint x="55" y="236" />
              <di:waypoint x="147" y="236" />
              <di:waypoint x="147" y="183" />
            </bpmndi:BPMNEdge>
            <bpmndi:BPMNEdge id="SequenceFlow_1x63ool_di" bpmnElement="SequenceFlow_1x63ool">
              <di:waypoint x="260" y="236" />
              <di:waypoint x="339" y="236" />
              <di:waypoint x="339" y="183" />
            </bpmndi:BPMNEdge>
            <bpmndi:BPMNEdge id="SequenceFlow_0rhetgr_di" bpmnElement="SequenceFlow_0rhetgr">
              <di:waypoint x="449" y="236" />
              <di:waypoint x="531" y="236" />
              <di:waypoint x="531" y="183" />
            </bpmndi:BPMNEdge>
            <bpmndi:BPMNEdge id="SequenceFlow_1j5zur3_di" bpmnElement="SequenceFlow_1j5zur3">
              <di:waypoint x="642" y="236" />
              <di:waypoint x="723" y="236" />
              <di:waypoint x="723" y="183" />
            </bpmndi:BPMNEdge>
            <bpmndi:BPMNShape id="IntermediateThrowEvent_08htr9z_di" bpmnElement="PPTest_IntermediateThrowEvent_Signal_Send">
              <dc:Bounds x="-218" y="35" width="36" height="36" />
            </bpmndi:BPMNShape>
            <bpmndi:BPMNEdge id="SequenceFlow_0swhu74_di" bpmnElement="SequenceFlow_0swhu74">
              <di:waypoint x="-182" y="53" />
              <di:waypoint x="-45" y="53" />
              <di:waypoint x="-45" y="103" />
            </bpmndi:BPMNEdge>
            <bpmndi:BPMNShape id="StartEvent_0i9rkuq_di" bpmnElement="PPTest_StartEvent_Timer">
              <dc:Bounds x="19" y="35" width="36" height="36" />
            </bpmndi:BPMNShape>
            <bpmndi:BPMNEdge id="SequenceFlow_1ch4uf2_di" bpmnElement="SequenceFlow_1ch4uf2">
              <di:waypoint x="55" y="53" />
              <di:waypoint x="147" y="53" />
              <di:waypoint x="147" y="103" />
            </bpmndi:BPMNEdge>
            <bpmndi:BPMNShape id="StartEvent_1p5mby7_di" bpmnElement="PPTest_StartEvent_Signal">
              <dc:Bounds x="224" y="35" width="36" height="36" />
            </bpmndi:BPMNShape>
            <bpmndi:BPMNEdge id="SequenceFlow_0jb75u2_di" bpmnElement="SequenceFlow_0jb75u2">
              <di:waypoint x="260" y="53" />
              <di:waypoint x="339" y="53" />
              <di:waypoint x="339" y="103" />
            </bpmndi:BPMNEdge>
            <bpmndi:BPMNShape id="StartEvent_170kavg_di" bpmnElement="PPTest_StartEvent_Message">
              <dc:Bounds x="413" y="35" width="36" height="36" />
            </bpmndi:BPMNShape>
            <bpmndi:BPMNEdge id="SequenceFlow_12o2b6h_di" bpmnElement="SequenceFlow_12o2b6h">
              <di:waypoint x="449" y="53" />
              <di:waypoint x="531" y="53" />
              <di:waypoint x="531" y="103" />
            </bpmndi:BPMNEdge>
            <bpmndi:BPMNShape id="BoundaryEvent_185l69l_di" bpmnElement="PPTest_BoundaryEvent_Error">
              <dc:Bounds x="179" y="85" width="36" height="36" />
            </bpmndi:BPMNShape>
            <bpmndi:BPMNShape id="BoundaryEvent_0jc7a75_di" bpmnElement="PPTest_BoundaryEvent_Conditional">
              <dc:Bounds x="-13" y="85" width="36" height="36" />
            </bpmndi:BPMNShape>
          </bpmndi:BPMNPlane>
        </bpmndi:BPMNDiagram>
      </bpmn:definitions>`
    };

    const requestHeaders: IRequestHeaders = this._getRequestHeaders();

    await this._http.post(requestDestination, requestPayload, requestHeaders);

    await browser.sleep(this._processEngineActionTimeout);
  }

  public async deleteDiagram(): Promise<void> {
    const requestDestination: string = `/api/management/v1/process_models/${this.name}/delete`;
    const requestHeaders: IRequestHeaders = this._getRequestHeaders();

    await this._http.get(requestDestination, requestHeaders);
  }

  private _getRequestHeaders(): IRequestHeaders {
    const requestHeaders: IRequestHeaders = {
      authorization: 'Bearer ZHVtbXlfdG9rZW4='
    };

    return requestHeaders;
  }
}
