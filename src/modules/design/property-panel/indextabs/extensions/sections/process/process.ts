import {EventAggregator} from 'aurelia-event-aggregator';
import {inject} from 'aurelia-framework';

import {
  IExtensionElement,
  IModdleElement,
  IPropertiesElement,
  IProperty,
  IShape,
} from '@process-engine/bpmn-elements_contracts';

import {IBpmnModdle, IPageModel} from '../../../../../../../contracts';
import environment from '../../../../../../../environment';

@inject(EventAggregator)
export class ProcessSection {
  public path: string = '/sections/process/process';
  public canHandleElement: boolean = false;

  public newNames: Array<string> = [];
  public newValues: Array<string> = [];
  public properties: Array<IProperty> = [];
  public shouldFocus: boolean = false;

  private _businessObjInPanel: IModdleElement;
  private _moddle: IBpmnModdle;
  private _propertiesElement: IPropertiesElement;
  private _eventAggregator: EventAggregator;

  constructor(eventAggregator?: EventAggregator) {
    this._eventAggregator = eventAggregator;
  }

  public activate(model: IPageModel): void {
    this._businessObjInPanel = model.elementInPanel.businessObject.participants[0];
    this._moddle = model.modeler.get('moddle');
    this._reloadProperties();
  }

  public isSuitableForElement(element: IShape): boolean {
    const businessObjectIsNotExisting: boolean = element === undefined || element.businessObject === undefined;
    if (businessObjectIsNotExisting) {
      return false;
    }

    const elementIsRoot: boolean = element.businessObject.$type === 'bpmn:Collaboration';

    return elementIsRoot;
  }

  public addProperty(): void {
    const bpmnPropertyProperties: Object = {
      name: '',
      value: '',
    };
    const bpmnProperty: IProperty = this._moddle.create('camunda:Property', bpmnPropertyProperties);

    this.newNames.push('');
    this.newValues.push('');

    const businessObjectHasNoExtensionElements: boolean =
      this._businessObjInPanel.processRef.extensionElements === undefined ||
      this._businessObjInPanel.processRef.extensionElements === null;
    if (businessObjectHasNoExtensionElements) {
      this._createExtensionElement();
    }

    this._propertiesElement = this._getPropertiesElement();

    const propertiesElementIsUndefined: boolean = this._propertiesElement === undefined;

    if (propertiesElementIsUndefined) {
      this._createEmptyCamundaProperties();
      this._propertiesElement = this._getPropertiesElement();
    }

    const propertyValuesUndefined: boolean = this._propertiesElement.values === undefined;
    if (propertyValuesUndefined) {
      this._propertiesElement.values = [];
    }

    this._propertiesElement.values.push(bpmnProperty);
    this.properties.push(bpmnProperty);
    this._publishDiagramChange();
    this.shouldFocus = true;
  }

  public removeProperty(index: number): void {
    const propertyIsLast: boolean = this._propertiesElement.values.length === 1;

    if (propertyIsLast) {
      this._businessObjInPanel.processRef.extensionElements = undefined;
    } else {
      this._propertiesElement.values.splice(index, 1);
    }

    this._reloadProperties();
    this._publishDiagramChange();
  }

  public changeName(index: number): void {
    this._propertiesElement.values[index].name = this.newNames[index];
    this._publishDiagramChange();
  }

  public changeValue(index: number): void {
    this._propertiesElement.values[index].value = this.newValues[index];
    this._publishDiagramChange();
  }

  public inputFieldBlurred(index: number, event: FocusEvent): void {
    const targetElement: HTMLElement = event.relatedTarget as HTMLElement;
    const targetIsNoInputField: boolean = !(targetElement instanceof HTMLInputElement);

    if (targetIsNoInputField) {
      this._checkAndRemoveEmptyProperties(index);

      return;
    }

    const targetFieldIndex: string = targetElement.getAttribute('data-fieldIndex');
    const indexAsString: string = index.toString();
    const targetValueFieldNotRelated: boolean = targetFieldIndex !== indexAsString;
    if (targetValueFieldNotRelated) {
      this._checkAndRemoveEmptyProperties(index);
    }
  }

  private _checkAndRemoveEmptyProperties(index: number): void {
    const propertyElement: IProperty = this._propertiesElement.values[index];
    const propertyIsEmpty: boolean = propertyElement.value === '' && propertyElement.name === '';
    if (propertyIsEmpty) {
      this.removeProperty(index);
    }
  }

  private _reloadProperties(): void {
    this.properties = [];
    this.newNames = [];
    this.newValues = [];
    this.shouldFocus = false;

    const businessObjectHasNoExtensionElements: boolean =
      this._businessObjInPanel.processRef.extensionElements === undefined ||
      this._businessObjInPanel.processRef.extensionElements === null;

    if (businessObjectHasNoExtensionElements) {
      return;
    }

    this._propertiesElement = this._getPropertiesElement();

    const extensionsPropertiesElement: IPropertiesElement = this._businessObjInPanel.processRef.extensionElements.values.find(
      (extensionValue: IExtensionElement) => {
        const extensionIsPropertyElement: boolean =
          extensionValue.$type === 'camunda:Properties' &&
          extensionValue.values !== undefined &&
          extensionValue.values !== null &&
          extensionValue.values.length !== 0;

        return extensionIsPropertyElement;
      },
    );

    const extensionElementHasNoPropertyElement: boolean = extensionsPropertiesElement === undefined;

    if (extensionElementHasNoPropertyElement) {
      return;
    }

    const properties: Array<IProperty> = extensionsPropertiesElement.values;
    for (const property of properties) {
      const propertyTypeIsNotCamunda: boolean = property.$type !== 'camunda:Property';

      if (propertyTypeIsNotCamunda) {
        continue;
      }
      this.newNames.push(property.name);
      this.newValues.push(property.value);
      this.properties.push(property);
    }
  }

  private _getPropertiesElement(): IPropertiesElement {
    const propertiesElement: IPropertiesElement = this._businessObjInPanel.processRef.extensionElements.values.find(
      (extensionValue: IExtensionElement) => {
        const extensionIsPropertiesElement: boolean = extensionValue.$type === 'camunda:Properties';

        return extensionIsPropertiesElement;
      },
    );

    return propertiesElement;
  }

  private _createExtensionElement(): void {
    const bpmnExecutionListenerProperties: Object = {
      class: '',
      event: '',
    };
    const bpmnExecutionListener: IModdleElement = this._moddle.create(
      'camunda:ExecutionListener',
      bpmnExecutionListenerProperties,
    );

    const extensionValues: Array<IModdleElement> = [];
    const propertiesElement: IPropertiesElement = this._moddle.create('camunda:Properties', {values: []});

    extensionValues.push(bpmnExecutionListener);
    extensionValues.push(propertiesElement);

    const extensionElements: IModdleElement = this._moddle.create('bpmn:ExtensionElements', {
      values: extensionValues,
    });
    this._businessObjInPanel.processRef.extensionElements = extensionElements;
  }

  private _createEmptyCamundaProperties(): void {
    const addPropertiesElement: (element: IPropertiesElement) => number = (element: IPropertiesElement): number =>
      this._businessObjInPanel.processRef.extensionElements.values.push(element);

    const emptyProperties: Array<IProperty> = [];

    const createCamundaProperties: () => IPropertiesElement = (): IPropertiesElement =>
      this._moddle.create('camunda:Properties', {values: emptyProperties});

    addPropertiesElement(createCamundaProperties());
  }

  private _publishDiagramChange(): void {
    this._eventAggregator.publish(environment.events.diagramChange);
  }
}
