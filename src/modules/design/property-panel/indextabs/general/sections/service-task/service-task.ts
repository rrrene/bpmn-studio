import {EventAggregator} from 'aurelia-event-aggregator';
import {inject} from 'aurelia-framework';

import {IPropertiesElement, IProperty, IServiceTaskElement, IShape} from '@process-engine/bpmn-elements_contracts';

import {IBpmnModdle, IPageModel, ISection} from '../../../../../../../contracts';
import environment from '../../../../../../../environment';
import {ServiceTaskService} from './components/service-task-service/service-task-service';

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
  public selectedKind: ServiceKind;

  private _eventAggregator: EventAggregator;
  private _moddle: IBpmnModdle;
  private _serviceTaskService: ServiceTaskService;

  constructor(eventAggregator?: EventAggregator) {
    this._eventAggregator = eventAggregator;
  }

  public activate(model: IPageModel): void {
    this._serviceTaskService = new ServiceTaskService(model);

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
      let moduleProperty: IProperty = this._serviceTaskService.getProperty('module');
      const modulePropertyDoesNotExist: boolean = moduleProperty === undefined;

      if (modulePropertyDoesNotExist) {
        this._createModuleProperty();
      }

      moduleProperty = this._serviceTaskService.getProperty('module');
      moduleProperty.value = this.selectedKind;

      this._deleteExternalTaskProperties();
    } else if (selectedKindIsExternalTask) {
      this.businessObjInPanel.type = this.selectedKind;
      this._deleteHttpProperties();
    } else {
      this._deleteExternalTaskProperties();
      this._deleteHttpProperties();
    }

    this._publishDiagramChange();
  }

  private _elementIsServiceTask(element: IShape): boolean {
    return (
      element !== undefined &&
      element.businessObject !== undefined &&
      element.businessObject.$type === 'bpmn:ServiceTask'
    );
  }

  private _publishDiagramChange(): void {
    this._eventAggregator.publish(environment.events.diagramChange);
  }

  private _createModuleProperty(): void {
    if (this._serviceTaskService.extensionElementDoesNotExist) {
      this._serviceTaskService.createExtensionElement();
    }

    const noPropertiesElement: boolean = this._serviceTaskService.getPropertiesElement() === undefined;

    if (noPropertiesElement) {
      this._serviceTaskService.createPropertiesElement();
    }

    const propertiesElement: IPropertiesElement = this._serviceTaskService.getPropertiesElement();

    const modulePropertyObject: Object = {
      name: 'module',
      value: 'HttpClient',
    };

    const moduleProperty: IProperty = this._moddle.create('camunda:Property', modulePropertyObject);

    propertiesElement.values.push(moduleProperty);
  }

  private _initServiceTask(): void {
    const taskIsExternalTask: boolean = this.businessObjInPanel.type === 'external';

    if (taskIsExternalTask) {
      this.selectedKind = ServiceKind.External;
      return;
    }

    const modulePropertyExists: boolean = this._serviceTaskService.getProperty('module') !== undefined;
    if (modulePropertyExists) {
      this.selectedKind = ServiceKind[this._serviceTaskService.getProperty('module').value];

      return;
    } else {
      this.selectedKind = ServiceKind.None;
    }
  }

  private _deleteHttpProperties(): void {
    const propertiesElement: IPropertiesElement = this._serviceTaskService.getPropertiesElement();
    const propertiesElementExists: boolean = propertiesElement !== undefined;

    if (propertiesElementExists) {
      propertiesElement.values = propertiesElement.values.filter((element: IProperty) => {
        return element.name !== 'method' && element.name !== 'params' && element.name !== 'module';
      });

      const emptyProperties: boolean = propertiesElement.values.length === 0;
      if (emptyProperties) {
        this._deletePropertiesElementAndExtensionElements();
      }
    }
  }

  private _deleteExternalTaskProperties(): void {
    delete this.businessObjInPanel.type;
    delete this.businessObjInPanel.topic;

    const propertiesElement: IPropertiesElement = this._serviceTaskService.getPropertiesElement();

    if (propertiesElement) {
      propertiesElement.values = propertiesElement.values.filter((element: IProperty) => {
        return element.name !== 'payload';
      });

      const emptyProperties: boolean = propertiesElement.values.length === 0;
      if (emptyProperties) {
        this._deletePropertiesElementAndExtensionElements();
      }
    }
  }

  private _deletePropertiesElementAndExtensionElements(): void {
    const indexOfPropertiesElement: number = this.businessObjInPanel.extensionElements.values.findIndex(
      (element: IPropertiesElement) => {
        if (!element) {
          return;
        }

        return element.$type === 'camunda:Properties';
      },
    );

    delete this.businessObjInPanel.extensionElements.values[indexOfPropertiesElement];

    // tslint:disable-next-line: no-magic-numbers
    const emptyExtensionElements: boolean = this.businessObjInPanel.extensionElements.values.length < 2;
    if (emptyExtensionElements) {
      delete this.businessObjInPanel.extensionElements;
    }
  }
}
