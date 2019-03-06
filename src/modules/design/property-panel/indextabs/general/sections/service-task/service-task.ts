import {EventAggregator} from 'aurelia-event-aggregator';
import {inject} from 'aurelia-framework';

import {IExtensionElement, IModdleElement, IPropertiesElement, IProperty, IServiceTaskElement, IShape} from '@process-engine/bpmn-elements_contracts';

import {IBpmnModdle, IPageModel, ISection} from '../../../../../../../contracts';
import environment from '../../../../../../../environment';

enum ServiceKind {
  None = 'null',
  HttpClient = 'HttpClient',
  External = 'external',
}

@inject(EventAggregator)
export class ServiceTaskSection implements ISection {

  public path: string = '/sections/service-task/service-task';
  public ServiceKind: typeof ServiceKind = ServiceKind;
  public canHandleElement: boolean = false;
  public businessObjInPanel: IServiceTaskElement;
  public model: IPageModel;
  public selectedKind: string;

  private _eventAggregator: EventAggregator;
  private _moddle: IBpmnModdle;

  constructor(eventAggregator?: EventAggregator) {
    this._eventAggregator = eventAggregator;
  }

  public activate(model: IPageModel): void {
    this.selectedKind = '';
    this.businessObjInPanel = model.elementInPanel.businessObject;
    this.model = model;
    this._moddle = model.modeler.get('moddle');

    this._initServiceTask();
  }

  public isSuitableForElement(element: IShape): boolean {
    return this._elementIsServiceTask(element);
  }

  public kindChanged(): void {
    const selectedKindIsHttpService: boolean = this.selectedKind === ServiceKind.HttpClient;
    const selectedKindIsExternalTask: boolean = this.selectedKind === ServiceKind.External;

    if (selectedKindIsHttpService) {
      let moduleProperty: IProperty = this._getProperty('module');
      const modulePropertyDoesNotExist: boolean = moduleProperty === undefined;

      if (modulePropertyDoesNotExist) {
        this._createModuleProperty();
      }

      moduleProperty = this._getProperty('module');
      moduleProperty.value = this.selectedKind;

      this._resetExternalTaskValues();

    } else if (selectedKindIsExternalTask) {
      this.businessObjInPanel.type = this.selectedKind;
      this._deleteHttpProperties();
    }

    this._publishDiagramChange();
  }

  private _elementIsServiceTask(element: IShape): boolean {
    return element !== undefined
        && element.businessObject !== undefined
        && element.businessObject.$type === 'bpmn:ServiceTask';
  }

  private _publishDiagramChange(): void {
    this._eventAggregator.publish(environment.events.diagramChange);
  }

  private _getPropertiesElement(): IPropertiesElement {
    const propertiesElement: IPropertiesElement = this.businessObjInPanel.extensionElements.values.find((element: IPropertiesElement) => {
      return element.$type === 'camunda:Properties' && element.values !== undefined;
    });

    return propertiesElement;
  }

  private _getProperty(propertyName: string): IProperty {
    let property: IProperty;

    const propertiesElement: IPropertiesElement = this._getPropertiesElement();

    property = propertiesElement.values.find((element: IProperty) => {
      return element.name === propertyName;
    });

    return property;
  }

  private _createModuleProperty(): void {
    const propertiesElement: IPropertiesElement = this._getPropertiesElement();

    const modulePropertyObject: Object = {
      name: 'module',
      value: 'HttpClient',
    };

    const moduleProperty: IProperty = this._moddle.create('camunda:Property', modulePropertyObject);

    propertiesElement.values.push(moduleProperty);
  }

  private _initServiceTask(): void {
    const extensionElementDoesNotExist: boolean = this.businessObjInPanel.extensionElements === undefined
                                         || this.businessObjInPanel.extensionElements.values === undefined;

    if (extensionElementDoesNotExist) {
      this._createExtensionElement();
    }

    const propertyElementDoesNotExists: boolean = this._getPropertiesElement() === undefined;

    if (propertyElementDoesNotExists) {
      this._createPropertiesElement();
    }

    const taskIsExternalTask: boolean = this.businessObjInPanel.type === 'external';

    if (taskIsExternalTask) {
      this.selectedKind = this.businessObjInPanel.type;

      return;
    }

    const modulePropertyExists: boolean = this._getProperty('module') !== undefined;
    if (modulePropertyExists) {
      this.selectedKind = this._getProperty('module').value;

      return;
    }

  }

  private _createExtensionElement(): void {
    const extensionValues: Array<IModdleElement> = [];

    const extensionElements: IModdleElement = this._moddle.create('bpmn:ExtensionElements', {values: extensionValues});
    this.businessObjInPanel.extensionElements = extensionElements;
  }

  private _createPropertiesElement(): void {
    const extensionElement: IExtensionElement = this.businessObjInPanel.extensionElements;

    const properties: Array<IProperty> = [];
    const propertiesElement: IPropertiesElement = this._moddle.create('camunda:Properties', {values: properties});

    extensionElement.values.push(propertiesElement);
  }

  private _deleteHttpProperties(): void {
    const propertiesElement: IPropertiesElement = this._getPropertiesElement();
    const propertiesElementExists: boolean = propertiesElement !== undefined;

    if (propertiesElementExists) {
      propertiesElement.values = propertiesElement.values.filter((element: IProperty) => {
        return element.name !== 'method' && element.name !== 'params' && element.name !== 'module';
      });
    }
  }

  private _resetExternalTaskValues(): void {
    this.businessObjInPanel.type = '';
    this.businessObjInPanel.topic = '';
  }
}
