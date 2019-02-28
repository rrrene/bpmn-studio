import {browser} from 'protractor';
import {HttpClient} from 'protractor-http-client';

import {IRequestHeaders, IRequestPayload} from '../contracts/index';

export class DiagramWithCallActivityAndTasks {
    // tslint:disable-next-line:no-magic-numbers
    public name: string =  'TA_' + Math.floor(Math.random() * 1000000);
    public userTaskId: string = 'Task_0tzmueo';
    public manualTaskId: string = 'Task_0u4cnp4';
    public callActivityId: string = 'Task_0f8akhm';
    public correlationId: string;
    public processInstanceId: string;
    public userTaskDynamicUiUrl: string;

    public targetDiagramId: string;

    // Define Instances
    private _processEngineUrl: string = browser.params.processEngineUrl;
    private _http: HttpClient = new HttpClient(this._processEngineUrl);
    private _applicationUrl: string = browser.params.aureliaUrl;

    constructor(targetDiagramId: string) {
      this.targetDiagramId = targetDiagramId;
    }

    public async deployDiagram(): Promise<void> {
      const requestDestination: string = `/api/management/v1/process_models/${this.name}/update`;
      const requestPayload: IRequestPayload = {
        xml: `<?xml version="1.0" encoding="UTF-8"?>
        <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
        xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
        xmlns:camunda="http://camunda.org/schema/1.0/bpmn" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definition_1"
        targetNamespace="http://bpmn.io/schema/bpmn" exporter="BPMN Studio" exporterVersion="1">
          <bpmn:collaboration id="Collaboration_1cidyxu" name="">
            <bpmn:extensionElements>
              <camunda:formData />
            </bpmn:extensionElements>
            <bpmn:participant id="Participant_0px403d" name="${this.name}" processRef="${this.name}" />
          </bpmn:collaboration>
          <bpmn:process id="${this.name}" name="${this.name}" isExecutable="true">
            <bpmn:laneSet>
              <bpmn:lane id="Lane_1xzf0d3" name="Lane">
                <bpmn:extensionElements>
                  <camunda:formData />
                </bpmn:extensionElements>
                <bpmn:flowNodeRef>StartEvent_1mox3jl</bpmn:flowNodeRef>
                <bpmn:flowNodeRef>Task_0u4cnp4</bpmn:flowNodeRef>
                <bpmn:flowNodeRef>EndEvent_0eie6q6</bpmn:flowNodeRef>
                <bpmn:flowNodeRef>ExclusiveGateway_033l1q7</bpmn:flowNodeRef>
                <bpmn:flowNodeRef>Task_0tzmueo</bpmn:flowNodeRef>
                <bpmn:flowNodeRef>Task_0f8akhm</bpmn:flowNodeRef>
                <bpmn:flowNodeRef>ExclusiveGateway_1nujyjh</bpmn:flowNodeRef>
              </bpmn:lane>
            </bpmn:laneSet>
            <bpmn:startEvent id="StartEvent_1mox3jl" name="Start Event">
              <bpmn:outgoing>SequenceFlow_1jdocur</bpmn:outgoing>
            </bpmn:startEvent>
            <bpmn:sequenceFlow id="SequenceFlow_1jdocur" sourceRef="StartEvent_1mox3jl" targetRef="Task_0u4cnp4" />
            <bpmn:manualTask id="Task_0u4cnp4" name="ManualTask">
              <bpmn:incoming>SequenceFlow_1jdocur</bpmn:incoming>
              <bpmn:outgoing>SequenceFlow_0zs87je</bpmn:outgoing>
            </bpmn:manualTask>
            <bpmn:sequenceFlow id="SequenceFlow_0zs87je" sourceRef="Task_0u4cnp4" targetRef="ExclusiveGateway_1nujyjh" />
            <bpmn:endEvent id="EndEvent_0eie6q6" name="End Event">
              <bpmn:extensionElements>
                <camunda:formData />
              </bpmn:extensionElements>
              <bpmn:incoming>SequenceFlow_1b6zaue</bpmn:incoming>
            </bpmn:endEvent>
            <bpmn:sequenceFlow id="SequenceFlow_01pqfbt" sourceRef="ExclusiveGateway_1nujyjh" targetRef="Task_0tzmueo" />
            <bpmn:sequenceFlow id="SequenceFlow_1cwomj3" sourceRef="ExclusiveGateway_1nujyjh" targetRef="Task_0f8akhm" />
            <bpmn:sequenceFlow id="SequenceFlow_0uyzu3c" sourceRef="Task_0tzmueo" targetRef="ExclusiveGateway_033l1q7" />
            <bpmn:sequenceFlow id="SequenceFlow_0equnaa" sourceRef="Task_0f8akhm" targetRef="ExclusiveGateway_033l1q7" />
            <bpmn:sequenceFlow id="SequenceFlow_1b6zaue" sourceRef="ExclusiveGateway_033l1q7" targetRef="EndEvent_0eie6q6" />
            <bpmn:parallelGateway id="ExclusiveGateway_033l1q7" name="">
              <bpmn:incoming>SequenceFlow_0uyzu3c</bpmn:incoming>
              <bpmn:incoming>SequenceFlow_0equnaa</bpmn:incoming>
              <bpmn:outgoing>SequenceFlow_1b6zaue</bpmn:outgoing>
            </bpmn:parallelGateway>
            <bpmn:userTask id="Task_0tzmueo" name="UserTask" camunda:formKey="Form Key">
              <bpmn:extensionElements>
                <camunda:formData />
              </bpmn:extensionElements>
              <bpmn:incoming>SequenceFlow_01pqfbt</bpmn:incoming>
              <bpmn:outgoing>SequenceFlow_0uyzu3c</bpmn:outgoing>
            </bpmn:userTask>
            <bpmn:callActivity id="Task_0f8akhm" name="CallAcitivity" calledElement="${this.targetDiagramId}">
              <bpmn:extensionElements>
                <camunda:formData />
              </bpmn:extensionElements>
              <bpmn:incoming>SequenceFlow_1cwomj3</bpmn:incoming>
              <bpmn:outgoing>SequenceFlow_0equnaa</bpmn:outgoing>
            </bpmn:callActivity>
            <bpmn:parallelGateway id="ExclusiveGateway_1nujyjh" name="">
              <bpmn:incoming>SequenceFlow_0zs87je</bpmn:incoming>
              <bpmn:outgoing>SequenceFlow_01pqfbt</bpmn:outgoing>
              <bpmn:outgoing>SequenceFlow_1cwomj3</bpmn:outgoing>
            </bpmn:parallelGateway>
          </bpmn:process>
          <bpmndi:BPMNDiagram id="BPMNDiagram_1">
            <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_1cidyxu">
              <bpmndi:BPMNShape id="Participant_0px403d_di" bpmnElement="Participant_0px403d">
                <dc:Bounds x="5" y="4" width="767" height="293" />
              </bpmndi:BPMNShape>
              <bpmndi:BPMNShape id="Lane_1xzf0d3_di" bpmnElement="Lane_1xzf0d3">
                <dc:Bounds x="35" y="4" width="737" height="293" />
              </bpmndi:BPMNShape>
              <bpmndi:BPMNShape id="StartEvent_1mox3jl_di" bpmnElement="StartEvent_1mox3jl">
                <dc:Bounds x="83" y="69" width="36" height="36" />
              </bpmndi:BPMNShape>
              <bpmndi:BPMNShape id="EndEvent_0eie6q6_di" bpmnElement="EndEvent_0eie6q6">
                <dc:Bounds x="689" y="69" width="36" height="36" />
                <bpmndi:BPMNLabel>
                  <dc:Bounds x="682" y="105" width="51" height="14" />
                </bpmndi:BPMNLabel>
              </bpmndi:BPMNShape>
              <bpmndi:BPMNEdge id="SequenceFlow_1jdocur_di" bpmnElement="SequenceFlow_1jdocur">
                <di:waypoint x="119" y="87" />
                <di:waypoint x="152" y="87" />
              </bpmndi:BPMNEdge>
              <bpmndi:BPMNShape id="ManualTask_0srbuuw_di" bpmnElement="Task_0u4cnp4">
                <dc:Bounds x="152" y="47" width="100" height="80" />
              </bpmndi:BPMNShape>
              <bpmndi:BPMNEdge id="SequenceFlow_0zs87je_di" bpmnElement="SequenceFlow_0zs87je">
                <di:waypoint x="252" y="87" />
                <di:waypoint x="294" y="87" />
              </bpmndi:BPMNEdge>
              <bpmndi:BPMNShape id="ParallelGateway_01i3xmw_di" bpmnElement="ExclusiveGateway_1nujyjh">
                <dc:Bounds x="294" y="62" width="50" height="50" />
              </bpmndi:BPMNShape>
              <bpmndi:BPMNEdge id="SequenceFlow_01pqfbt_di" bpmnElement="SequenceFlow_01pqfbt">
                <di:waypoint x="344" y="87" />
                <di:waypoint x="384" y="87" />
              </bpmndi:BPMNEdge>
              <bpmndi:BPMNShape id="UserTask_1ieaizd_di" bpmnElement="Task_0tzmueo">
                <dc:Bounds x="384" y="47" width="100" height="80" />
              </bpmndi:BPMNShape>
              <bpmndi:BPMNEdge id="SequenceFlow_1cwomj3_di" bpmnElement="SequenceFlow_1cwomj3">
                <di:waypoint x="319" y="112" />
                <di:waypoint x="319" y="197" />
                <di:waypoint x="384" y="197" />
              </bpmndi:BPMNEdge>
              <bpmndi:BPMNShape id="CallActivity_097qa7j_di" bpmnElement="Task_0f8akhm">
                <dc:Bounds x="384" y="157" width="100" height="80" />
              </bpmndi:BPMNShape>
              <bpmndi:BPMNEdge id="SequenceFlow_0uyzu3c_di" bpmnElement="SequenceFlow_0uyzu3c">
                <di:waypoint x="484" y="87" />
                <di:waypoint x="520" y="87" />
              </bpmndi:BPMNEdge>
              <bpmndi:BPMNEdge id="SequenceFlow_0equnaa_di" bpmnElement="SequenceFlow_0equnaa">
                <di:waypoint x="484" y="197" />
                <di:waypoint x="545" y="197" />
                <di:waypoint x="545" y="112" />
              </bpmndi:BPMNEdge>
              <bpmndi:BPMNEdge id="SequenceFlow_1b6zaue_di" bpmnElement="SequenceFlow_1b6zaue">
                <di:waypoint x="570" y="87" />
                <di:waypoint x="689" y="87" />
              </bpmndi:BPMNEdge>
              <bpmndi:BPMNShape id="ParallelGateway_0dry6w1_di" bpmnElement="ExclusiveGateway_033l1q7">
                <dc:Bounds x="520" y="62" width="50" height="50" />
              </bpmndi:BPMNShape>
            </bpmndi:BPMNPlane>
          </bpmndi:BPMNDiagram>
        </bpmn:definitions>`,
      };

      const requestHeaders: IRequestHeaders = this._getRequestHeaders();

      await this._http.post(requestDestination, requestPayload, requestHeaders);
    }

    public async deleteDiagram(): Promise<void> {
      const requestDestination: string = `/api/management/v1/process_models/${this.name}/delete`;
      const requestHeaders: IRequestHeaders = this._getRequestHeaders();

      await this._http.get(requestDestination, requestHeaders);
    }

    public async startProcess(): Promise<void> {
      const requestDestination: string =
        `/api/management/v1/process_models/${this.name}/start?start_callback_type=1&start_event_id=StartEvent_1mox3jl`;

      const requestPayload: IRequestPayload = {};
      const requestHeaders: IRequestHeaders = this._getRequestHeaders();

      await this._http.post(requestDestination, requestPayload, requestHeaders).jsonBody.then((jsonBody: JSON) => {
        this.correlationId = jsonBody['correlationId'];
        this.processInstanceId = jsonBody['processInstanceId'];
      });

      this.userTaskDynamicUiUrl = this._applicationUrl +
                                  '/correlation/' + this.correlationId +
                                  '/diagram/' + this.name +
                                  '/instance/' + this.processInstanceId +
                                  '/task/' + this.userTaskId;
    }

    private _getRequestHeaders(): IRequestHeaders {
      const requestHeaders: IRequestHeaders = {
        authorization: 'Bearer ZHVtbXlfdG9rZW4=',
      };

      return requestHeaders;
    }
}
