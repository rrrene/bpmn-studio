import {EventAggregator} from 'aurelia-event-aggregator';
import {inject} from 'aurelia-framework';

import {IConditionExpression, IFlowElement, IShape} from '@process-engine/bpmn-elements_contracts';

import {IBpmnModdle, IPageModel, ISection} from '../../../../../../../contracts';
import environment from '../../../../../../../environment';

@inject(EventAggregator)
export class FlowSection implements ISection {
  public path: string = '/sections/flow/flow';
  public canHandleElement: boolean = false;
  public condition: string;

  private _businessObjInPanel: IFlowElement;
  private _moddle: IBpmnModdle;
  private _eventAggregator: EventAggregator;

  constructor(eventAggregator?: EventAggregator) {
    this._eventAggregator = eventAggregator;
  }

  public activate(model: IPageModel): void {
    this._businessObjInPanel = model.elementInPanel.businessObject;
    this._moddle = model.modeler.get('moddle');

    this._init();
  }

  public isSuitableForElement(elementShape: IShape): boolean {
    if (elementShape !== undefined && elementShape !== null) {
      const element: IFlowElement = elementShape.businessObject;
      if (!this._elementIsFlow(element)) {
        return false;
      }

      const isDefaultFlow: boolean =
        element.sourceRef !== null && element.sourceRef.default && element.sourceRef.default.id === element.id;
      if (isDefaultFlow) {
        return false;
      }
      const flowPointsAtExclusiveGateway: boolean =
        element.targetRef !== null && element.targetRef.$type === 'bpmn:ExclusiveGateway';
      const flowStartsAtExclusiveGateway: boolean =
        element.sourceRef !== null && element.sourceRef.$type === 'bpmn:ExclusiveGateway';

      const flowHasCondition: boolean = flowPointsAtExclusiveGateway || flowStartsAtExclusiveGateway;

      return flowHasCondition;
    }
  }

  public updateCondition(): void {
    const objectHasNoConditionExpression: boolean =
      this._businessObjInPanel.conditionExpression === undefined ||
      this._businessObjInPanel.conditionExpression === null;

    if (objectHasNoConditionExpression) {
      this._createConditionExpression();
    }

    this._businessObjInPanel.conditionExpression.body = this.condition;
    this._publishDiagramChange();
  }

  private _createConditionExpression(): void {
    const conditionExpression: IConditionExpression = this._moddle.create('bpmn:FormalExpression', {});
    this._businessObjInPanel.conditionExpression = conditionExpression;
  }

  private _elementIsFlow(element: IFlowElement): boolean {
    return element !== undefined && element !== null && element.$type === 'bpmn:SequenceFlow';
  }

  private _init(): void {
    if (
      this._businessObjInPanel.conditionExpression &&
      this._businessObjInPanel.conditionExpression.body !== undefined
    ) {
      this.condition = this._businessObjInPanel.conditionExpression.body;
    } else {
      this.condition = '';
    }
  }

  private _publishDiagramChange(): void {
    this._eventAggregator.publish(environment.events.diagramChange);
  }
}
