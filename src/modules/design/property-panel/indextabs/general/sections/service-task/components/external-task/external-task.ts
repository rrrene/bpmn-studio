import {EventAggregator} from 'aurelia-event-aggregator';
import {bindable, inject} from 'aurelia-framework';

import {
  IProperty,
  IServiceTaskElement,
} from '@process-engine/bpmn-elements_contracts';

import {IBpmnModdle, IPageModel} from '../../../../../../../../../contracts';
import environment from '../../../../../../../../../environment';
import {ServiceTaskService} from '../service-task-service/service-task-service';

@inject(EventAggregator)
export class ExternalTask {

  @bindable() public model: IPageModel;
  public businessObjInPanel: IServiceTaskElement;
  public selectedTopic: string;
  public selectedPayload: string;

  private _eventAggregator: EventAggregator;
  private _serviceTaskService: ServiceTaskService;

  constructor(eventAggregator?: EventAggregator) {
    this._eventAggregator = eventAggregator;
  }

  public modelChanged(): void {
    this._serviceTaskService = new ServiceTaskService(this.model);
    this.businessObjInPanel = this.model.elementInPanel.businessObject;

    this.selectedTopic = this.businessObjInPanel.topic;
    this.selectedPayload = this._getPayloadFromModel();
  }

  public topicChanged(): void {
    this.businessObjInPanel.topic = this.selectedTopic;

    this._publishDiagramChange();
  }

  public payloadChanged(): void {
    this._setPayloadToModel(this.selectedPayload);

    this._publishDiagramChange();
  }

  private _getPayloadFromModel(): string | undefined {
    const payloadProperty: IProperty = this._serviceTaskService.getProperty('payload');

    const payloadPropertyExists: boolean = payloadProperty !== undefined;
    if (payloadPropertyExists) {
      return payloadProperty.value;
    } else {
      return undefined;
    }
  }

  private _setPayloadToModel(value: string): void {
    let payloadProperty: IProperty = this._serviceTaskService.getProperty('payload');

    const payloadPropertyNotExists: boolean = payloadProperty === undefined;

    if (payloadPropertyNotExists) {
      payloadProperty = this._serviceTaskService.createProperty('payload');
    }

    payloadProperty.value = value;
  }

  private _publishDiagramChange(): void {
    this._eventAggregator.publish(environment.events.diagramChange);
  }
}
