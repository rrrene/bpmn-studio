import {EventAggregator} from 'aurelia-event-aggregator';
import {inject} from 'aurelia-framework';

import {IModdleElement, IShape} from '@process-engine/bpmn-elements_contracts';

import {IPageModel, ISection} from '../../../../../../../contracts';
import environment from '../../../../../../../environment';

@inject(EventAggregator)
export class ProcessSection implements ISection {

  public path: string = '/sections/process/process';
  public canHandleElement: boolean = false;
  public businessObjInPanel: any;

  private _eventAggregator: EventAggregator;

  constructor(eventAggregator?: EventAggregator) {
    this._eventAggregator = eventAggregator;
  }

  public activate(model: IPageModel): void {
    this.businessObjInPanel = model.modeler._definitions.rootElements.find((rootElement: IModdleElement) => {
      return rootElement.$type === 'bpmn:Process';
    });
  }

  public isSuitableForElement(element: IShape): boolean {
    const elementHasNoBusinessObject: boolean = element === undefined || element.businessObject === undefined;
    if (elementHasNoBusinessObject) {
      return false;
    }

    const elementIsRoot: boolean = element.businessObject.$type === 'bpmn:Collaboration';

    return elementIsRoot;
  }

  public toggleExecutable(): void {
    this._publishDiagramChange();
  }

  private _publishDiagramChange(): void {
    this._eventAggregator.publish(environment.events.diagramChange);
  }
}
