import { EventAggregator } from 'aurelia-event-aggregator';
import { inject } from 'aurelia-framework';

import { IScriptTaskElement, IShape } from '@process-engine/bpmn-elements_contracts';

import { IPageModel, ISection } from '../../../../../../../contracts';
import environment from '../../../../../../../environment';

@inject(EventAggregator)
export class ScriptTaskSection implements ISection {
  public path: string = '/sections/script-task/script-task';
  public canHandleElement: boolean = false;
  public businessObjInPanel: IScriptTaskElement;

  private _eventAggregator: EventAggregator;

  constructor(eventAggregator?: EventAggregator) {
    this._eventAggregator = eventAggregator;
  }

  public activate(model: IPageModel): void {
    this.businessObjInPanel = model.elementInPanel.businessObject;
  }

  public isSuitableForElement(element: IShape): boolean {
    return this._elementIsScriptTask(element);
  }

  public updateScript(): void {
    this._publishDiagramChange();
  }

  private _elementIsScriptTask(element: IShape): boolean {
    return (
      element !== undefined &&
      element.businessObject !== undefined &&
      element.businessObject.$type === 'bpmn:ScriptTask'
    );
  }

  private _publishDiagramChange(): void {
    this._eventAggregator.publish(environment.events.diagramChange);
  }
}
