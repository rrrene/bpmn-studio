import {browser} from 'protractor';
import {HttpClient} from 'protractor-http-client';

import {IRequestHeaders, IRequestPayload} from '../contracts/index';

export class DiagramWithUserTask {
    // tslint:disable-next-line:no-magic-numbers
    public name: string =  'TA_' + Math.floor(Math.random() * 1000000);
    public userTaskId: string = 'Task_1adxlm1';
    public correlationId: string;
    public processInstanceId: string;
    public userTaskDynamicUiUrl: string;

    // Define Instances
    private _processEngineUrl: string = browser.params.processEngineUrl;
    private _http: HttpClient = new HttpClient(this._processEngineUrl);
    private _applicationUrl: string = browser.params.aureliaUrl;

    public async deployDiagram(): Promise<void> {
      const requestDestination: string = `/api/management/v1/process_models/${this.name}/update`;
      const requestPayload: IRequestPayload = {
        xml: `<?xml version="1.0" encoding="UTF-8"?>
        <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
        xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definition_1" targetNamespace="http://bpmn.io/schema/bpmn"
        exporter="BPMN Studio" exporterVersion="1">
          <bpmn:collaboration id="Collaboration_1cidyxu" name="">
            <bpmn:participant id="Participant_0px403d" name="${this.name}" processRef="${this.name}" />
          </bpmn:collaboration>
          <bpmn:process id="${this.name}" name="${this.name}" isExecutable="true">
            <bpmn:laneSet>
              <bpmn:lane id="Lane_1xzf0d3" name="Lane">
                <bpmn:flowNodeRef>StartEvent_1mox3jl</bpmn:flowNodeRef>
                <bpmn:flowNodeRef>EndEvent_0eie6q6</bpmn:flowNodeRef>
                <bpmn:flowNodeRef>Task_1adxlm1</bpmn:flowNodeRef>
              </bpmn:lane>
            </bpmn:laneSet>
            <bpmn:startEvent id="StartEvent_1mox3jl" name="Start Event">
              <bpmn:outgoing>SequenceFlow_04ksesr</bpmn:outgoing>
            </bpmn:startEvent>
            <bpmn:endEvent id="EndEvent_0eie6q6" name="End Event">
              <bpmn:incoming>SequenceFlow_197qjgi</bpmn:incoming>
            </bpmn:endEvent>
            <bpmn:sequenceFlow id="SequenceFlow_04ksesr" sourceRef="StartEvent_1mox3jl" targetRef="Task_1adxlm1" />
            <bpmn:sequenceFlow id="SequenceFlow_197qjgi" sourceRef="Task_1adxlm1" targetRef="EndEvent_0eie6q6" />
            <bpmn:userTask id="Task_1adxlm1" name="">
              <bpmn:incoming>SequenceFlow_04ksesr</bpmn:incoming>
              <bpmn:outgoing>SequenceFlow_197qjgi</bpmn:outgoing>
            </bpmn:userTask>
          </bpmn:process>
          <bpmndi:BPMNDiagram id="BPMNDiagram_1">
            <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_1cidyxu">
              <bpmndi:BPMNShape id="Participant_0px403d_di" bpmnElement="Participant_0px403d">
                <dc:Bounds x="5" y="4" width="581" height="170" />
              </bpmndi:BPMNShape>
              <bpmndi:BPMNShape id="Lane_1xzf0d3_di" bpmnElement="Lane_1xzf0d3">
                <dc:Bounds x="35" y="4" width="551" height="170" />
              </bpmndi:BPMNShape>
              <bpmndi:BPMNShape id="StartEvent_1mox3jl_di" bpmnElement="StartEvent_1mox3jl">
                <dc:Bounds x="83" y="69" width="36" height="36" />
              </bpmndi:BPMNShape>
              <bpmndi:BPMNShape id="EndEvent_0eie6q6_di" bpmnElement="EndEvent_0eie6q6">
                <dc:Bounds x="503" y="69" width="36" height="36" />
              </bpmndi:BPMNShape>
              <bpmndi:BPMNEdge id="SequenceFlow_04ksesr_di" bpmnElement="SequenceFlow_04ksesr">
                <di:waypoint x="119" y="87" />
                <di:waypoint x="242" y="87" />
              </bpmndi:BPMNEdge>
              <bpmndi:BPMNEdge id="SequenceFlow_197qjgi_di" bpmnElement="SequenceFlow_197qjgi">
                <di:waypoint x="342" y="87" />
                <di:waypoint x="503" y="87" />
              </bpmndi:BPMNEdge>
              <bpmndi:BPMNShape id="UserTask_1luo32z_di" bpmnElement="Task_1adxlm1">
                <dc:Bounds x="242" y="47" width="100" height="80" />
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
        `/api/management/v1/process_models/${this.name}/start_events/start?start_callback_type=1&start_event_id=StartEvent_1mox3jl`;

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
