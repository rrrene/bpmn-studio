import {EventAggregator, Subscription} from 'aurelia-event-aggregator';
import {bindable, inject} from 'aurelia-framework';

import {DataModels} from '@process-engine/management_api_contracts';
import {IDiagram} from '@process-engine/solutionexplorer.contracts';

import {ISolutionEntry, InspectPanelTab} from '../../../../../contracts/index';
import environment from '../../../../../environment';

@inject(EventAggregator)
export class InspectPanel {
  @bindable public correlations: Array<DataModels.Correlations.Correlation>;
  @bindable public processInstances: Array<DataModels.Correlations.CorrelationProcessInstance>;
  @bindable public selectedProcessInstance: DataModels.Correlations.CorrelationProcessInstance;
  @bindable public selectedCorrelation: DataModels.Correlations.Correlation;
  @bindable public fullscreen: boolean = false;
  @bindable public activeDiagram: IDiagram;
  @bindable public activeSolutionEntry: ISolutionEntry;
  public InspectPanelTab: typeof InspectPanelTab = InspectPanelTab;
  public showCorrelationList: boolean = true;
  public showLogViewer: boolean;

  private _eventAggregator: EventAggregator;
  private _subscriptions: Array<Subscription>;

  constructor(eventAggregator: EventAggregator) {
    this._eventAggregator = eventAggregator;
  }

  public attached(): void {
    this._subscriptions = [
      this._eventAggregator.subscribe(environment.events.inspectCorrelation.showLogViewer, () => {
        this.changeTab(InspectPanelTab.LogViewer);
      }),
    ];
  }

  public detached(): void {
    for (const subscription of this._subscriptions) {
      subscription.dispose();
    }
  }

  public toggleFullscreen(): void {
    this.fullscreen = !this.fullscreen;

    this._eventAggregator.publish(environment.events.inspect.shouldDisableTokenViewerButton, this.fullscreen);
  }

  public activeDiagramChanged(): void {
    this.selectedProcessInstance = undefined;

    this.showLogViewer = false;
    this.showCorrelationList = true;
  }

  public changeTab(inspectPanelTab: InspectPanelTab): void {
    const shouldShowCorrelationList: boolean = inspectPanelTab === InspectPanelTab.CorrelationList;
    const shouldShowLogViewer: boolean = inspectPanelTab === InspectPanelTab.LogViewer;

    this.showCorrelationList = shouldShowCorrelationList;
    this.showLogViewer = shouldShowLogViewer;
  }

  public correlationChanged(
    newCorrelation: DataModels.Correlations.Correlation,
    oldCorrelation: DataModels.Correlations.Correlation,
  ): void {
    const firstCorrelationGotSelected: boolean = oldCorrelation !== undefined;
    const shouldEnableTokenViewerButton: boolean = !(firstCorrelationGotSelected || this.fullscreen);

    if (shouldEnableTokenViewerButton) {
      this._eventAggregator.publish(environment.events.inspect.shouldDisableTokenViewerButton, false);
    }
  }
}
