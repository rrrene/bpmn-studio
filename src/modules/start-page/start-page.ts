import {EventAggregator} from 'aurelia-event-aggregator';
import {inject} from 'aurelia-framework';

import environment from '../../environment';

@inject(EventAggregator)
export class StartPage {
  private _eventAggregator: EventAggregator;

  public isRunningInElectron: boolean = (window as any).nodeRequire;
  public isRunningOnWindows: boolean = false;
  public isRunningOnMacOS: boolean = false;

  constructor(eventAggregator: EventAggregator) {
    this._eventAggregator = eventAggregator;
  }

  public activate(): void {
    if (this.isRunningInElectron) {
      this.isRunningOnWindows = process.platform === 'win32';
      this.isRunningOnMacOS = process.platform === 'darwin';
    }
  }

  public openLocalSolution(): void {
    this._eventAggregator.publish(environment.events.startPage.openLocalSolution);
  }

  public openDiagram(): void {
    this._eventAggregator.publish(environment.events.startPage.openDiagram);
  }

  public createNewDiagram(): void {
    this._eventAggregator.publish(environment.events.startPage.createDiagram);
  }
}
