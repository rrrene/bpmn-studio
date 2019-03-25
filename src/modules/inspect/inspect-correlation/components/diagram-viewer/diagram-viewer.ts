import {bindable, inject} from 'aurelia-framework';

import {IShape} from '@process-engine/bpmn-elements_contracts';
import * as bundle from '@process-engine/bpmn-js-custom-bundle';
import {DataModels} from '@process-engine/management_api_contracts';
import {IDiagram} from '@process-engine/solutionexplorer.contracts';

import {EventAggregator, Subscription} from 'aurelia-event-aggregator';
import {
  defaultBpmnColors,
  IBpmnModeler,
  IBpmnXmlSaveOptions,
  ICanvas,
  IColorPickerColor,
  IDiagramExportService,
  IElementRegistry,
  IEvent,
  IModeling,
  NotificationType,
} from '../../../../../contracts/index';
import environment from '../../../../../environment';
import {NotificationService} from '../../../../../services/notification-service/notification.service';
import {DiagramExportService} from '../../../../design/bpmn-io/services/index';

@inject('NotificationService', EventAggregator)
export class DiagramViewer {
  @bindable public processInstance: DataModels.Correlations.CorrelationProcessModel;
  @bindable public xml: string;
  @bindable public activeDiagram: IDiagram;
  @bindable public selectedFlowNode: IShape;
  public xmlIsNotSelected: boolean = true;
  public canvasModel: HTMLElement;

  private _notificationService: NotificationService;
  private _elementRegistry: IElementRegistry;
  private _diagramModeler: IBpmnModeler;
  private _diagramViewer: IBpmnModeler;
  private _modeling: IModeling;
  private _uncoloredXml: string;
  private _uncoloredSVG: string;
  private _subscriptions: Array<Subscription>;
  private _diagramExportService: IDiagramExportService;
  private _eventAggregator: EventAggregator;

  constructor(notificationService: NotificationService, eventAggregator: EventAggregator) {
    this._notificationService = notificationService;
    this._diagramExportService = new DiagramExportService();
    this._eventAggregator = eventAggregator;
  }

  public attached(): void {
    this._diagramModeler = new bundle.modeler();
    this._diagramViewer = new bundle.viewer({
      additionalModules:
      [
        bundle.ZoomScrollModule,
        bundle.MoveCanvasModule,
      ],
    });

    this._modeling = this._diagramModeler.get('modeling');
    this._elementRegistry = this._diagramModeler.get('elementRegistry');

    this._diagramViewer.attachTo(this.canvasModel);

    this._diagramViewer.on('element.click', async(event: IEvent) => {
      await this._colorizeSelection(event.element);

      this.selectedFlowNode = event.element;
    });

    this._subscriptions = [
      this._eventAggregator.subscribe(`${environment.events.inspect.exportDiagramAs}:BPMN`, async() => {
        try {
          const exportName: string = `${this.activeDiagram.name}.bpmn`;
          await this._diagramExportService
            .loadXML(this._uncoloredXml)
            .asBpmn()
            .export(exportName);
        } catch (error) {
          this._notificationService.showNotification(NotificationType.ERROR, 'An error occurred while preparing the diagram for exporting');
        }
      }),

      this._eventAggregator.subscribe(`${environment.events.inspect.exportDiagramAs}:SVG`, async() => {
        try {
          const exportName: string = `${this.activeDiagram.name}.svg`;
          await this._diagramExportService
            .loadSVG(this._uncoloredSVG)
            .asSVG()
            .export(exportName);
        } catch (error) {
          this._notificationService.showNotification(NotificationType.ERROR, 'An error occurred while preparing the diagram for exporting');
        }
      }),

      this._eventAggregator.subscribe(`${environment.events.inspect.exportDiagramAs}:PNG`, async() => {
        try {
          const exportName: string = `${this.activeDiagram.name}.png`;
          await this._diagramExportService
            .loadSVG(this._uncoloredSVG)
            .asPNG()
            .export(exportName);
        } catch (error) {
          this._notificationService.showNotification(NotificationType.ERROR, 'An error occurred while preparing the diagram for exporting');
        }
      }),

      this._eventAggregator.subscribe(`${environment.events.inspect.exportDiagramAs}:JPEG`, async() => {
        try {
          const exportName: string = `${this.activeDiagram.name}.jpeg`;
          await this._diagramExportService
            .loadSVG(this._uncoloredSVG)
            .asJPEG()
            .export(exportName);
        } catch (error) {
          this._notificationService.showNotification(NotificationType.ERROR, 'An error occurred while preparing the diagram for exporting');
        }
      }),
    ];
  }

  public detached(): void {
    const bjsContainer: Element = this.canvasModel.getElementsByClassName('bjs-container')[0];

    const bjsContainerIsExisting: boolean = this.canvasModel !== undefined
                                            && this.canvasModel !== null
                                            && this.canvasModel.childElementCount > 1
                                            && bjsContainer !== undefined
                                            && bjsContainer !== null;

    if (bjsContainerIsExisting) {
      this.canvasModel.removeChild(bjsContainer);
    }

    const diagramViewerIsExisting: boolean = this._diagramViewer !== undefined;

    if (diagramViewerIsExisting) {
      this._diagramViewer.detach();
      this._diagramViewer.destroy();

      this._diagramViewer = undefined;
      this.xml = undefined;
      this.xmlIsNotSelected = true;
    }

    this._subscriptions.forEach((subscription: Subscription) => subscription.dispose());
  }

  public async processInstanceChanged(): Promise<void> {
    const noProcessInstanceSelected: boolean = this.processInstance === undefined;
    if (noProcessInstanceSelected) {
      return;
    }

    this.xml = this.processInstance.xml;

    await this._importXml(this._diagramModeler, this.xml);
    this._clearColors();
    this._uncoloredXml = await this._getXmlFromModeler();

    await this._importXml(this._diagramViewer, this._uncoloredXml);
    this._uncoloredSVG = await this._getSVG();

    const elementSelected: boolean = this.selectedFlowNode !== undefined;
    if (elementSelected) {
      const elementsToColorize: Array<IShape> = this._elementRegistry.filter((element: IShape) => {
        const isSelectedElement: boolean = element.id === this.selectedFlowNode.id;

        return isSelectedElement;
      });

      const correlationHasSameElementASelected: boolean = elementsToColorize.length > 0;
      if (correlationHasSameElementASelected) {
        this._colorizeSelection(this.selectedFlowNode);

        const colorizedXml: string = await this._getXmlFromModeler();
        await this._importXml(this._diagramViewer, colorizedXml);

        return;
      }
    }

    this.fitDiagramToViewport();
  }

  public activeDiagramChanged(): void {
    const diagramViewerIsNotSet: boolean = this._diagramViewer === undefined;

    if (diagramViewerIsNotSet) {
      return;
    }

    this._diagramViewer.clear();
    this.xmlIsNotSelected = true;
    this.xml = undefined;

    this.fitDiagramToViewport();
  }

  public xmlChanged(): void {
    this.xmlIsNotSelected = this.xml === undefined;
  }

  public fitDiagramToViewport(): void {
    const canvas: ICanvas = this._diagramViewer.get('canvas');
    canvas.zoom('fit-viewport', 'auto');
  }

  private async _colorizeSelection(selectedElement: IShape): Promise<void> {
    await this._importXml(this._diagramModeler, this._uncoloredXml);

    const elementToColorize: IShape = this._elementRegistry.filter((element: IShape): boolean => {
      const isSelectedElement: boolean = element.id === selectedElement.id;

      return isSelectedElement;
    })[0];

    this._colorElement(elementToColorize, defaultBpmnColors.grey);

    const colorizedXml: string = await this._getXmlFromModeler();
    this._importXml(this._diagramViewer, colorizedXml);
  }

  private _clearColors(): void {
    const elementsWithColor: Array<IShape> = this._elementRegistry.filter((element: IShape): boolean => {
      const elementHasFillColor: boolean = element.businessObject.di.fill !== undefined;
      const elementHasBorderColor: boolean = element.businessObject.di.stroke !== undefined;

      const elementHasColor: boolean = elementHasFillColor || elementHasBorderColor;

      return elementHasColor;
    });

    const noElementsWithColor: boolean = elementsWithColor.length === 0;
    if (noElementsWithColor) {
      return;
    }

    this._modeling.setColor(elementsWithColor, {
      stroke: defaultBpmnColors.none.border,
      fill: defaultBpmnColors.none.fill,
    });
  }

  private _colorElement(element: IShape, color: IColorPickerColor): void {
    this._modeling.setColor(element, {
      stroke: color.border,
      fill: color.fill,
    });
  }

  private async _importXml(modeler: IBpmnModeler, xml: string): Promise<void> {
    const xmlIsNotLoaded: boolean = (xml === undefined || xml === null);

    if (xmlIsNotLoaded) {
      const notificationMessage: string = 'The xml could not be loaded. Please try to reopen the Inspect Correlation View.';
      this._notificationService.showNotification(NotificationType.ERROR, notificationMessage);

      return;
    }

    const xmlImportPromise: Promise<void> = new Promise((resolve: Function, reject: Function): void => {
      modeler.importXML(xml, (importXmlError: Error) => {
        if (importXmlError) {
          reject(importXmlError);

          return;
        }
        resolve();
      });
    });

    return xmlImportPromise;
  }

  private async _getXmlFromModeler(): Promise<string> {
    const saveXmlPromise: Promise<string> = new Promise((resolve: Function, reject: Function): void =>  {
      const xmlSaveOptions: IBpmnXmlSaveOptions = {
        format: true,
      };

      this._diagramModeler.saveXML(xmlSaveOptions, async(saveXmlError: Error, xml: string) => {
        if (saveXmlError) {
          reject(saveXmlError);

          return;
        }

        resolve(xml);
      });
    });

    return saveXmlPromise;
  }

  private async _getSVG(): Promise<string> {
    const returnPromise: Promise<string> = new Promise((resolve: Function, reject: Function): void => {
      this._diagramViewer.saveSVG({ format: true }, (error: Error, result: string) => {
        if (error) {
          reject(error);
        }

        resolve(result);
      });
    });

    return returnPromise;
  }
}
