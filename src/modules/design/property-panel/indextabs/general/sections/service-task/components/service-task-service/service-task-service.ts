import {IExtensionElement, IModdleElement, IPropertiesElement, IProperty} from '@process-engine/bpmn-elements_contracts';
import {IBpmnModdle, IPageModel} from '../../../../../../../../../contracts';

export class ServiceTaskService {

  private _model: IPageModel;
  private _businessObjInPanel: IModdleElement;

  private _moddle: IBpmnModdle;

  constructor(model: IPageModel) {
    this._model = model;
    this._businessObjInPanel = model.elementInPanel.businessObject;
    this._moddle = this._model.modeler.get('moddle');
  }

  public createExtensionElement(): void {
    const extensionValues: Array<IModdleElement> = [];

    const extensionElements: IModdleElement = this._moddle.create('bpmn:ExtensionElements', {values: extensionValues});
    this._businessObjInPanel.extensionElements = extensionElements;
  }

  public createPropertiesElement(): void {
    const extensionElement: IExtensionElement = this._businessObjInPanel.extensionElements;

    const properties: Array<IProperty> = [];
    const propertiesElement: IPropertiesElement = this._moddle.create('camunda:Properties', {values: properties});

    extensionElement.values.push(propertiesElement);
  }

  public createProperty(propertyName: string): IProperty {
    if (this.extensionElementDoesNotExist) {
      this.createExtensionElement();
    }

    const noPropertiesElement: boolean = this.getPropertiesElement() === undefined;

    if (noPropertiesElement) {
      this.createPropertiesElement();
    }

    const propertiesElement: IPropertiesElement = this.getPropertiesElement();

    const propertyObject: Object = {
      name: propertyName,
      value: '',
    };

    const property: IProperty = this._moddle.create('camunda:Property', propertyObject);

    propertiesElement.values.push(property);

    return property;
  }

  public getProperty(propertyName: string): IProperty | undefined {
    const propertiesElement: IPropertiesElement = this.getPropertiesElement();

    if (!propertiesElement) {
      return undefined;
    }

    const property: IProperty = propertiesElement.values.find((element: IProperty) => {
      return element.name === propertyName;
    });

    return property;
  }

  public getPropertiesElement(): IPropertiesElement | undefined {
    if (this.extensionElementDoesNotExist) {
      return undefined;
    }

    const propertiesElement: IPropertiesElement = this._businessObjInPanel.extensionElements.values.find((element: IPropertiesElement) => {
      if (!element) {
        return;
      }
      return element.$type === 'camunda:Properties';
    });

    const noPropertyElementFound: boolean = propertiesElement === undefined;
    if (noPropertyElementFound) {
      return undefined;
    }

    const noValuesDefined: boolean = propertiesElement.values === undefined;
    if (noValuesDefined) {
      propertiesElement.values = [];
    }

    return propertiesElement;
  }

  public get extensionElementDoesNotExist(): boolean {
    return this._businessObjInPanel.extensionElements === undefined
        || this._businessObjInPanel.extensionElements.values === undefined;
  }
}
