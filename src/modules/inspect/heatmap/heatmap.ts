import {bindable, inject} from 'aurelia-framework';

import * as bundle from '@process-engine/bpmn-js-custom-bundle';
import {FlowNodeRuntimeInformation} from '@process-engine/kpi_api_contracts';
import {IDiagram} from '@process-engine/solutionexplorer.contracts';

import {
  IBpmnModeler,
  ICanvas,
  IElementRegistry,
  IOverlayManager,
  ISolutionEntry,
  IViewbox,
} from '../../../contracts/index';

import {IFlowNodeAssociation, IHeatmapService} from './contracts';

@inject('HeatmapService')
export class Heatmap {
  public viewerContainer: HTMLDivElement;
  @bindable() public activeDiagram: IDiagram;
  @bindable() public activeSolutionEntry: ISolutionEntry;

  private _heatmapService: IHeatmapService;
  private _modeler: IBpmnModeler;
  private _viewer: IBpmnModeler;

  constructor(heatmapService: IHeatmapService) {
    this._heatmapService = heatmapService;
  }

  public activeSolutionEntryChanged(newValue: ISolutionEntry): void {
    this._heatmapService.setIdentity(newValue.identity);
  }

  public activeDiagramChanged(): void {

    const attachedViewer: Element = document.getElementsByClassName('bjs-container')[0];

    const viewerContainerIsAttached: boolean = this.viewerContainer !== undefined
                                            && this.viewerContainer !== null
                                            && this.viewerContainer.childElementCount > 1
                                            && attachedViewer !== undefined
                                            && attachedViewer !== null;

    if (viewerContainerIsAttached) {
      this.viewerContainer.removeChild(attachedViewer);
    }

    const viewerIsInitialized: boolean = this._viewer !== undefined;
    if (viewerIsInitialized) {
      this._viewer.detach();
      this._viewer.destroy();
    }

    this.attached();
  }

  public async attached(): Promise<void> {

    const noActiveDiagram: boolean = this.activeDiagram === undefined;
    if (noActiveDiagram) {
      return;
    }

    const diagramIsNoRemoteDiagram: boolean = !this.activeDiagram.uri.startsWith('http');
    if (diagramIsNoRemoteDiagram) {
      return;
    }

    this._modeler = new bundle.modeler({
      moddleExtensions: {
        camunda: bundle.camundaModdleDescriptor,
      },
    });

    await this._pushXmlToBpmnModeler(this.activeDiagram.xml, this._modeler);

    const elementRegistry: IElementRegistry  = this._modeler.get('elementRegistry');
    /*
     * TODO: Refactoring opportunity; HeatmapService could use a fluent API; This is how it would look like:
     * this._heatmapService
     *   .setFlowNodeAssociations(elementRegistry) // -> associations
     *   .setRuntimeInformationForProcessModel(this.processmodelid) // -> flowNodeRuntimeInformation
     *   .getColoredXML(this._modeler) // <- associations, flowNodeRuntimeInformation
     */

    const associations: Array<IFlowNodeAssociation> = await this._heatmapService.getFlowNodeAssociations(elementRegistry);

    const flowNodeRuntimeInformation: Array<FlowNodeRuntimeInformation> = await this
      ._heatmapService
      .getRuntimeInformationForProcessModel(this.activeDiagram.id);

    const xml: string = await this._heatmapService.getColoredXML(associations, flowNodeRuntimeInformation, this._modeler);

    this._viewer = new bundle.viewer({
      additionalModules:
      [
        bundle.ZoomScrollModule,
        bundle.MoveCanvasModule,
        bundle.MiniMap,
      ],
    });

    await this._pushXmlToBpmnModeler(xml, this._viewer);

    const overlays: IOverlayManager = this._viewer.get('overlays');

    this._heatmapService.addOverlays(overlays, elementRegistry, this.activeDiagram.id);

    this._viewer.attachTo(this.viewerContainer);

    this._fitDiagramToViewport();
  }

  private _pushXmlToBpmnModeler(xml: string, modeler: IBpmnModeler): Promise<void> {
    return new Promise((resolve: Function, reject: Function): void => {
      modeler.importXML(xml, (importXmlError: Error) => {
        if (importXmlError) {
          reject(importXmlError);
          return;
        }
        resolve();
      });
    });
  }

  private _fitDiagramToViewport(): void {
    const canvas: ICanvas = this._viewer.get('canvas');
    const viewbox: IViewbox  = canvas.viewbox();
    const diagramIsVisible: boolean = viewbox.height > 0 && viewbox.width > 0;

    if (diagramIsVisible) {
      canvas.zoom('fit-viewport');
    }
  }

}
