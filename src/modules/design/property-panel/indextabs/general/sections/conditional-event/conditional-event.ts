import {EventAggregator} from 'aurelia-event-aggregator';
import {inject} from 'aurelia-framework';

import {IConditionalEventElement, IEventElement, IModdleElement, IShape} from '@process-engine/bpmn-elements_contracts';

import {IBpmnModdle, ILinting, IPageModel, ISection} from '../../../../../../../contracts';
import environment from '../../../../../../../environment';

@inject(EventAggregator)
export class ConditionalEventSection implements ISection {

  public path: string = '/sections/conditional-event/conditional-event';
  public canHandleElement: boolean = false;
  public conditionBody: string;
  public variableName: string;
  public variableEvent: string;

  private _businessObjInPanel: IConditionalEventElement;
  private _moddle: IBpmnModdle;
  private _linter: ILinting;
  private _conditionObject: IModdleElement;
  private _eventAggregator: EventAggregator;

  constructor(eventAggregator?: EventAggregator) {
    this._eventAggregator = eventAggregator;
  }

  public activate(model: IPageModel): void {
    this._moddle = model.modeler.get('moddle');
    this._linter = model.modeler.get('linting');
    this._businessObjInPanel = model.elementInPanel.businessObject as IConditionalEventElement;

    const {variableName, variableEvent, condition} = this._businessObjInPanel.eventDefinitions[0];

    this.variableEvent = (variableEvent === undefined) ? '' : variableEvent;
    this.variableName = (variableName === undefined) ? '' : variableName;
    this.conditionBody = (condition === undefined) ? '' : condition.body;

    this._conditionObject = this._moddle.create('bpmn:FormalExpression', {body: this.conditionBody});
    this._businessObjInPanel.eventDefinitions[0].condition = this._conditionObject;
  }

  public isSuitableForElement(element: IShape): boolean {
    const elementHasNoBusinessObject: boolean = element === undefined || element.businessObject === undefined;
    if (elementHasNoBusinessObject) {
      return false;
    }

    const eventElement: IEventElement = element.businessObject as IEventElement;

    const elementIsConditionalEvent: boolean = eventElement.eventDefinitions !== undefined
                                            && eventElement.eventDefinitions[0] !== undefined
                                            && eventElement.eventDefinitions[0].$type === 'bpmn:ConditionalEventDefinition';

    return elementIsConditionalEvent;
  }

  public updateCondition(): void {
    this._businessObjInPanel.eventDefinitions[0].condition.body = this.conditionBody;
    this._publishDiagramChange();

    this._linter.update();
  }

  public updateVariableName(): void {
    this._businessObjInPanel.eventDefinitions[0].variableName = this.variableName;
    this._publishDiagramChange();
  }

  public updateVariableEvent(): void {
    this._businessObjInPanel.eventDefinitions[0].variableEvent = this.variableEvent;
    this._publishDiagramChange();
  }

  private _publishDiagramChange(): void {
    this._eventAggregator.publish(environment.events.diagramChange);
  }
}
