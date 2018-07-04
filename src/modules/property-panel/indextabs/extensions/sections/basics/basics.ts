import {EventAggregator} from 'aurelia-event-aggregator';
import {inject} from 'aurelia-framework';

import {
  IBpmnModdle,
  IExtensionElement,
  IModdleElement,
  IPageModel,
  IProperty,
  IPropertyElement,
  ISection,
  IShape,
} from '../../../../../../contracts';
import environment from '../../../../../../environment';

@inject(EventAggregator)
export class BasicsSection implements ISection {

  public path: string = '/sections/basics/basics';
  public canHandleElement: boolean = false;
  public properties: Array<any> = [];
  public newNames: Array<string> = [];
  public newValues: Array<string> = [];

  private _businessObjInPanel: IModdleElement;
  private _moddle: IBpmnModdle;
  private _propertyElement: IPropertyElement;
  private _eventAggregator: EventAggregator;

  constructor(eventAggregator?: EventAggregator) {
    this._eventAggregator = eventAggregator;
  }

  public activate(model: IPageModel): void {
    this._businessObjInPanel = model.elementInPanel.businessObject;
    this._moddle = model.modeler.get('moddle');
    this._init();
  }

  public isSuitableForElement(element: IShape): boolean {
    if (element.businessObject === undefined) {
      return false;
    }

    const elementHasExtensions: boolean = element.businessObject.$type !== 'bpmn:Process'
                                       && element.businessObject.$type !== 'bpmn:Collaboration';

    return elementHasExtensions;
  }

  public addProperty(): void {
    const bpmnPropertyProperties: Object = {
      name: '',
      value: '',
    };
    const bpmnProperty: IProperty = this._moddle.create('camunda:Property', bpmnPropertyProperties);

    this.newNames.push('');
    this.newValues.push('');

    this._propertyElement.values.push(bpmnProperty);
    this.properties.push(bpmnProperty);
    this._publishDiagramChange();
  }

  public removeProperty(index: number): void {
    this._propertyElement.values.splice(index, 1);
    this._reloadProperties();
    this._publishDiagramChange();
  }

  public changeName(index: number): void {
    this._propertyElement.values[index].name = this.newNames[index];
    this._publishDiagramChange();
  }

  public changeValue(index: number): void {
    this._propertyElement.values[index].value = this.newValues[index];
    this._publishDiagramChange();
  }

  private _init(): void {
    this._propertyElement = this._getPropertyElement();
    this._reloadProperties();
  }

  private _reloadProperties(): void {
    this.properties = [];
    this.newNames = [];
    this.newValues = [];

    const elementHasNoProperties: boolean = this._propertyElement === undefined
                                         || this._propertyElement === null
                                         || this._propertyElement.values === undefined
                                         || this._propertyElement.values === null
                                         || this._propertyElement.values.length === 0;

    if (elementHasNoProperties) {
      return;
    }

    const properties: Array<IProperty> = this._propertyElement.values;
    for (const property of properties) {
      if (property.$type !== 'camunda:Property') {
        continue;
      }
      this.newNames.push(property.name);
      this.newValues.push(property.value);
      this.properties.push(property);
    }
  }

  private _getPropertyElement(): IPropertyElement {
    const hasBusinessObjExtensionElements: boolean = this._businessObjInPanel.extensionElements === undefined
                                                  || this._businessObjInPanel.extensionElements === null;

    if (hasBusinessObjExtensionElements) {
      this._createExtensionElement();
    }

    const propertyElement: IPropertyElement  = this._businessObjInPanel.extensionElements.values.find((extensionValue: IExtensionElement) => {
      const extensionIsPropertyElement: boolean = extensionValue.$type === 'camunda:Properties'
                                               && extensionValue.values !== undefined
                                               && extensionValue.values !== null;

      return extensionIsPropertyElement;
    });

    if (propertyElement === undefined) {
      this._createEmptyPropertyElement();

      return this._getPropertyElement();
    }

    return propertyElement;
  }

  private _createExtensionElement(): void {
    const bpmnExecutionListenerProperties: Object = {
      class: '',
      event: '',
    };
    const bpmnExecutionListener: IModdleElement = this._moddle.create('camunda:ExecutionListener', bpmnExecutionListenerProperties);

    const extensionValues: Array<IModdleElement> = [];
    const propertyValues: Array<IProperty> = [];
    const propertyElement: IPropertyElement = this._moddle.create('camunda:Properties', {values: propertyValues});
    extensionValues.push(bpmnExecutionListener);
    extensionValues.push(propertyElement);

    const extensionElements: IModdleElement = this._moddle.create('bpmn:ExtensionElements', {values: extensionValues});
    this._businessObjInPanel.extensionElements = extensionElements;
  }

  private _publishDiagramChange(): void {
    this._eventAggregator.publish(environment.events.diagramChange);
  }

}
