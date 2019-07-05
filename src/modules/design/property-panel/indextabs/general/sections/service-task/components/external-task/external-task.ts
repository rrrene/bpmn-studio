import {EventAggregator} from 'aurelia-event-aggregator';
import {bindable, inject, observable} from 'aurelia-framework';

import {IPropertiesElement, IProperty, IServiceTaskElement} from '@process-engine/bpmn-elements_contracts';

import {IBpmnModdle, IPageModel} from '../../../../../../../../../contracts';
import environment from '../../../../../../../../../environment';

@inject(EventAggregator)
export class ExternalTask {

  @bindable() public model: IPageModel;
  public businessObjInPanel: IServiceTaskElement;
  public selectedTopic: string;
  public selectedPayload: string;

  private _eventAggregator: EventAggregator;
  private _moddle: IBpmnModdle;

  constructor(eventAggregator?: EventAggregator) {
    this._eventAggregator = eventAggregator;
  }

  public modelChanged(): void {
    this.businessObjInPanel = this.model.elementInPanel.businessObject;
    this._moddle = this.model.modeler.get('moddle');
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
    const payloadProperty: IProperty = this._getProperty('payload');

    const payloadPropertyExists: boolean = payloadProperty !== undefined;
    if (payloadPropertyExists) {
      return payloadProperty.value;
    } else {
      return undefined;
    }
  }

  private _setPayloadToModel(value: string): void {
    let payloadProperty: IProperty = this._getProperty('payload');

    const payloadPropertyNotExists: boolean = payloadProperty === undefined;

    if (payloadPropertyNotExists) {
      payloadProperty = this._createProperty('payload');
    }

    payloadProperty.value = value;
  }

  private _publishDiagramChange(): void {
    this._eventAggregator.publish(environment.events.diagramChange);
  }

  private _createProperty(propertyName: string): IProperty {
    const propertiesElement: IPropertiesElement = this._getPropertiesElement();

    const propertyObject: any = {
      name: propertyName,
      value: '',
    };

    const property: IProperty = this._moddle.create('camunda:Property', propertyObject);

    propertiesElement.values.push(property);

    return property;
  }

  private _getPropertiesElement(): IPropertiesElement {
    const propertiesElement: IPropertiesElement = this.businessObjInPanel.extensionElements.values.find((element: IPropertiesElement) => {
      const elementIsCamundaProperties: boolean = element.$type === 'camunda:Properties';
      const elementContainsValues: boolean = element.values !== undefined;

      return elementIsCamundaProperties && elementContainsValues;
    });

    return propertiesElement;
  }

  private _getProperty(propertyName: string): IProperty {
    const propertiesElement: IPropertiesElement = this._getPropertiesElement();

    const property: IProperty = propertiesElement.values.find((element: IProperty) => {
      return element.name === propertyName;
    });

    return property;
  }
}
