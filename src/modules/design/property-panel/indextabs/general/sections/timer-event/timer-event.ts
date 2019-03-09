import {EventAggregator} from 'aurelia-event-aggregator';
import {inject} from 'aurelia-framework';

import {IEventElement, IModdleElement, IShape, ITimerEventElement} from '@process-engine/bpmn-elements_contracts';

import {
  IBpmnModdle,
  ILinting,
  IPageModel,
  ISection,
} from '../../../../../../../contracts';
import environment from '../../../../../../../environment';

enum TimerType {
  Date,
  Duration,
  Cycle,
}

@inject(EventAggregator)
export class TimerEventSection implements ISection {

  public path: string = '/sections/timer-event/timer-event';
  public canHandleElement: boolean = false;
  public timerElement: IModdleElement;
  public TimerType: typeof TimerType = TimerType;
  public timerType: TimerType;

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

    this.timerElement = this._getTimerElement();

    this._init();
  }

  public isSuitableForElement(element: IShape): boolean {
    const elementHasNoBusinessObject: boolean = element === undefined || element.businessObject === undefined;

    if (elementHasNoBusinessObject) {
      return false;
    }

    const eventElement: IEventElement = element.businessObject as IEventElement;

    const elementIsTimerEvent: boolean = eventElement.eventDefinitions !== undefined
                                      && eventElement.eventDefinitions[0] !== undefined
                                      && eventElement.eventDefinitions[0].$type === 'bpmn:TimerEventDefinition';

    return elementIsTimerEvent;
  }

  public updateTimerType(): void {
    const moddleElement: IModdleElement = this._moddle.create('bpmn:FormalExpression', {
                                            body: this.timerElement.body,
                                          });

    let timerTypeObject: Object;

    switch (this.timerType) {
      case TimerType.Date: {
        timerTypeObject = {
          timeDate: moddleElement,
        };
        break;
      }
      case TimerType.Duration: {
        timerTypeObject = {
          timeDuration: moddleElement,
        };
        break;
      }
      case TimerType.Cycle: {
        timerTypeObject = {
          timeCycle: moddleElement,
        };
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

    if (this._linter.lintingActive()) {
      this._linter.update();
    }
  }

  public updateTimerDefinition(): void {
    const timeElement: IModdleElement = this._getTimerElement();
    timeElement.body = this.timerElement.body;
    this._publishDiagramChange();

    if (this._linter.lintingActive()) {
      this._linter.update();
    }
  }

  private _init(): void {
    const {timeDate, timeDuration, timeCycle} = this._businessObjInPanel.eventDefinitions[0];

    if ((timeDate === undefined)
        && (timeDuration === undefined)
        && (timeCycle === undefined)) {
      return;
    }

    if (timeCycle !== undefined) {
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
    const {timeDuration, timeDate, timeCycle} = this._businessObjInPanel.eventDefinitions[0];

    if (timeDuration !== undefined) {
       return timeDuration;
    }
    if (timeDate !== undefined) {
      return timeDate;
    }
    if (timeCycle !== undefined) {
      return timeCycle;
    }

    const timerEventDefinition: IModdleElement = this._moddle.create('bpmn:FormalExpression', {body: ''});
    return timerEventDefinition;
  }

  private _publishDiagramChange(): void {
    this._eventAggregator.publish(environment.events.diagramChange);
  }

}
