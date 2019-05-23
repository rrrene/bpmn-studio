import {EventAggregator, Subscription} from 'aurelia-event-aggregator';
import {bindable, inject} from 'aurelia-framework';
import {Router} from 'aurelia-router';

import {IDiagram, ISolution} from '@process-engine/solutionexplorer.contracts';

import {AuthenticationStateEvent, ISolutionEntry} from '../../../contracts/index';
import environment from '../../../environment';

@inject(EventAggregator, Router)
export class DiagramList {

  public allDiagrams: Array<IDiagram>;
  @bindable() public activeSolutionEntry: ISolutionEntry;

  private _eventAggregator: EventAggregator;
  private _router: Router;
  private _subscriptions: Array<Subscription>;
  private _pollingTimeout: NodeJS.Timer | number;
  private _isAttached = false;

  constructor(eventAggregator: EventAggregator,
              router: Router) {
    this._eventAggregator = eventAggregator;
    this._router = router;
  }

  public async attached(): Promise<void> {
    this._isAttached = true;

    await this._updateDiagramList();
    this._startPolling();

    this._subscriptions = [
      this._eventAggregator.subscribe(AuthenticationStateEvent.LOGIN, () => {
        this._updateDiagramList();
      }),
      this._eventAggregator.subscribe(AuthenticationStateEvent.LOGOUT, () => {
        this._updateDiagramList();
      }),
    ];
  }

  public detached(): void {
    this._isAttached = false;

    clearTimeout(this._pollingTimeout as NodeJS.Timer);
    for (const subscription of this._subscriptions) {
      subscription.dispose();
    }
  }

  private _startPolling(): void {
    this._pollingTimeout = setTimeout(async() => {
      await this._updateDiagramList();

      if(this._isAttached) {
        this._startPolling();
      }
    }, environment.processengine.processDefListPollingIntervalInMs);
  }

  public showDetails(diagramName: string): void {

    this._router.navigateToRoute('design', {
      diagramName: diagramName,
      solutionUri: this.activeSolutionEntry.uri,
      view: 'detail',
    });
  }

  private async _updateDiagramList(): Promise<void> {
    const solution: ISolution = await this.activeSolutionEntry.service.loadSolution();
    this.allDiagrams = solution.diagrams;
  }
}
