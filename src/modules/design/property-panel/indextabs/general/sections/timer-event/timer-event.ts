import { EventAggregator } from 'aurelia-event-aggregator';
import { bindable, inject } from 'aurelia-framework';

import {
  IEventElement,
  IExtensionElement,
  IModdleElement,
  IPropertiesElement,
  IProperty,
  IShape,
  ITimerEventElement
} from '@process-engine/bpmn-elements_contracts';

import { IBpmnModdle, ILinting, IPageModel, ISection } from '../../../../../../../contracts';
import environment from '../../../../../../../environment';

enum TimerType {
  Date,
  Duration,
  Cycle
}

@inject(EventAggregator)
export class TimerEventSection implements ISection {
  public path: string = '/sections/timer-event/timer-event';
  public canHandleElement: boolean = false;
  public timerElement: IModdleElement;
  public TimerType: typeof TimerType = TimerType;
  public timerType: TimerType;
  public isTimerStartEvent: boolean = false;
  @bindable public isEnabled: boolean = true;

  private _businessObjInPanel: ITimerEventElement;
  private _moddle: IBpmnModdle;
  private _linter: ILinting;
  private _eventAggregator: EventAggregator;

  constructor(eventAggregator?: EventAggregator) {
    this._eventAggregator = eventAggregator;
  }

  public activate(model: IPageModel): void {
    this._businessObjInPanel = model.elementInPanel.businessObject as ITimerEventElement;

    this._moddle = model.modeler.get('moddle');
    this._linter = model.modeler.get('linting');

    this.isTimerStartEvent = this._businessObjInPanel.$type === 'bpmn:StartEvent';

    this.timerElement = this._getTimerElement();

    this._init();
  }

  public isSuitableForElement(element: IShape): boolean {
    const elementHasNoBusinessObject: boolean = element === undefined || element.businessObject === undefined;

    if (elementHasNoBusinessObject) {
      return false;
    }

    const eventElement: IEventElement = element.businessObject as IEventElement;

    const elementIsTimerEvent: boolean =
      eventElement.eventDefinitions !== undefined &&
      eventElement.eventDefinitions[0] !== undefined &&
      eventElement.eventDefinitions[0].$type === 'bpmn:TimerEventDefinition';

    return elementIsTimerEvent;
  }

  public updateTimerType(): void {
    const moddleElement: IModdleElement = this._moddle.create('bpmn:FormalExpression', {
      body: this.timerElement.body
    });

    let timerTypeObject: Object;

    switch (this.timerType) {
      case TimerType.Date: {
        timerTypeObject = {
          timeDate: moddleElement
        };
        break;
      }
      case TimerType.Duration: {
        timerTypeObject = {
          timeDuration: moddleElement
        };
        break;
      }
      case TimerType.Cycle: {
        timerTypeObject = this.isTimerStartEvent ? { timeCycle: moddleElement } : {};
        break;
      }
      default: {
        timerTypeObject = {};
      }
    }

    delete this._businessObjInPanel.eventDefinitions[0].timeCycle;
    delete this._businessObjInPanel.eventDefinitions[0].timeDuration;
    delete this._businessObjInPanel.eventDefinitions[0].timeDate;

    Object.assign(this._businessObjInPanel.eventDefinitions[0], timerTypeObject);
    this.timerElement.body = '';

    this._publishDiagramChange();
    this._updateLinterWhenActive();
  }

  public updateTimerDefinition(): void {
    const timerElement: IModdleElement = this._getTimerElement();
    timerElement.body = this.timerElement.body;

    this._publishDiagramChange();
    this._updateLinterWhenActive();
  }

  public isEnabledChanged(): void {
    const enabledProperty: IProperty = this._getProperty('enabled');
    enabledProperty.value = this.isEnabled.toString();

    this._publishDiagramChange();
  }

  private _init(): void {
    if (this.isTimerStartEvent) {
      const extensionElementDoesNotExist: boolean = this._businessObjInPanel.extensionElements === undefined;
      if (extensionElementDoesNotExist) {
        this._createExtensionElement();
      }

      const propertyElementDoesNotExists: boolean = this._getPropertiesElement() === undefined;
      if (propertyElementDoesNotExists) {
        this._createPropertiesElement();
      }

      const enabledProperty: IProperty = this._getProperty('enabled');

      const enabledPropertyExists: boolean = enabledProperty !== undefined;
      if (enabledPropertyExists) {
        this.isEnabled = enabledProperty.value === 'true';
      } else {
        this._createProperty('enabled');
        this._getProperty('enabled').value = 'true';
      }
    }

    const { timeDate, timeDuration, timeCycle } = this._businessObjInPanel.eventDefinitions[0];

    if (timeCycle !== undefined && this.isTimerStartEvent) {
      this.timerType = TimerType.Cycle;
      return;
    }

    if (timeDuration !== undefined) {
      this.timerType = TimerType.Duration;
      return;
    }

    if (timeDate !== undefined) {
      this.timerType = TimerType.Date;
      return;
    }
  }

  private _getTimerElement(): IModdleElement {
    const { timeDuration, timeDate, timeCycle } = this._businessObjInPanel.eventDefinitions[0];

    if (timeDuration !== undefined) {
      return timeDuration;
    }
    if (timeDate !== undefined) {
      return timeDate;
    }

    if (timeCycle !== undefined && this.isTimerStartEvent) {
      return timeCycle;
    }

    const timerEventDefinition: IModdleElement = this._moddle.create('bpmn:FormalExpression', { body: '' });
    return timerEventDefinition;
  }

  private _publishDiagramChange(): void {
    this._eventAggregator.publish(environment.events.diagramChange);
  }

  private _updateLinterWhenActive(): void {
    if (this._linter.lintingActive()) {
      this._linter.update();
    }
  }

  private _createExtensionElement(): void {
    const extensionValues: Array<IModdleElement> = [];

    const extensionElements: IModdleElement = this._moddle.create('bpmn:ExtensionElements', {
      values: extensionValues
    });
    this._businessObjInPanel.extensionElements = extensionElements;
  }

  private _createPropertiesElement(): void {
    const extensionElement: IExtensionElement = this._businessObjInPanel.extensionElements;

    const properties: Array<IProperty> = [];
    const propertiesElement: IPropertiesElement = this._moddle.create('camunda:Properties', { values: properties });

    extensionElement.values.push(propertiesElement);
  }

  private _createProperty(propertyName: string): void {
    const propertiesElement: IPropertiesElement = this._getPropertiesElement();

    const propertyObject: object = {
      name: propertyName,
      value: ''
    };

    const property: IProperty = this._moddle.create('camunda:Property', propertyObject);

    propertiesElement.values.push(property);
  }

  private _getProperty(propertyName: string): IProperty {
    const propertiesElement: IPropertiesElement = this._getPropertiesElement();

    const property: IProperty = propertiesElement.values.find((element: IProperty) => {
      return element.name === propertyName;
    });

    return property;
  }

  private _getPropertiesElement(): IPropertiesElement {
    const propertiesElement: IPropertiesElement = this._businessObjInPanel.extensionElements.values.find(
      (element: IPropertiesElement) => {
        return element.$type === 'camunda:Properties' && element.values !== undefined;
      }
    );

    return propertiesElement;
  }
}
