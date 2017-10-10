import {IProcessDefEntity} from '@process-engine-js/process_engine_contracts';
import {EventAggregator, Subscription} from 'aurelia-event-aggregator';
import {computedFrom, inject} from 'aurelia-framework';
import {AuthenticationStateEvent, IProcessEngineService, IWidget} from '../../contracts/index';
import {DynamicUiWrapper} from '../dynamic-ui-wrapper/dynamic-ui-wrapper';

@inject('ProcessEngineService', EventAggregator)
export class ProcessStart {

  private processEngineService: IProcessEngineService;
  private eventAggregator: EventAggregator;
  private dynamicUiWrapper: DynamicUiWrapper;
  private subscriptions: Array<Subscription>;
  private processId: string;
  private _process: IProcessDefEntity;

  constructor(processEngineService: IProcessEngineService, eventAggregator: EventAggregator) {
    this.processEngineService = processEngineService;
    this.eventAggregator = eventAggregator;
  }

  private activate(routeParameters: {processId: string}): void {
    this.processId = routeParameters.processId;
    this.refreshProcess();
  }

  public attached(): void {
    this.subscriptions = [
      this.eventAggregator.subscribe(AuthenticationStateEvent.LOGIN, this.refreshProcess.bind(this)),
      this.eventAggregator.subscribe(AuthenticationStateEvent.LOGOUT, this.refreshProcess.bind(this)),
      this.eventAggregator.subscribe('render-dynamic-ui', (message: IWidget) => {
        this.dynamicUiWrapper.currentWidget = message;
      }),
    ];
  }

  public detached(): void {
    this.subscriptions.forEach((subscription: Subscription): void => {
      subscription.dispose();
    });
  }

  private refreshProcess(): void {
    this.processEngineService.getProcessbyID(this.processId)
      .then((result: any) => {
        if (result && !result.error) {
          this._process = result;
        } else {
          this._process = null;
        }
    });
  }

  @computedFrom('_process')
  public get process(): IProcessDefEntity {
    return this._process;
  }

  public startProcess(): void {
    this.processEngineService.startProcess(this.process);
  }
}