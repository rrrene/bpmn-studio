import {inject} from 'aurelia-dependency-injection';
import {EventAggregator, Subscription} from 'aurelia-event-aggregator';
import {bindable, computedFrom} from 'aurelia-framework';

import {IShape} from '@process-engine/bpmn-elements_contracts';
import * as bundle from '@process-engine/bpmn-js-custom-bundle';
import {IDiagram} from '@process-engine/solutionexplorer.contracts';
import {diff} from 'bpmn-js-differ';

import {
  defaultBpmnColors,
  DiffMode,
  IBpmnModdle,
  IBpmnModeler,
  IBpmnXmlSaveOptions,
  ICanvas,
  IChangeListEntry,
  IColorPickerColor,
  IDefinition,
  IDiffChangeListData,
  IDiffChanges,
  IElementChange,
  IElementRegistry,
  IEventFunction,
  IModeling,
  ISolutionEntry,
  IViewbox,
  NotificationType,
} from '../../../contracts/index';
import environment from '../../../environment';
import {ElementNameService} from '../../../services/elementname-service/elementname.service';
import {NotificationService} from '../../../services/notification-service/notification.service';
import {SolutionService} from '../../../services/solution-service/SolutionService';

@inject('NotificationService', EventAggregator, 'SolutionService')
export class BpmnDiffView {
  @bindable() public currentXml: string;
  @bindable() public previousXml: string;
  @bindable() public savedXml: string;
  @bindable() public processModelId: string;
  @bindable() public deployedXml: string;
  public xmlChanges: IDiffChanges;
  public leftCanvasModel: HTMLElement;
  public rightCanvasModel: HTMLElement;
  public lowerCanvasModel: HTMLElement;
  public currentDiffMode: DiffMode = DiffMode.NewVsOld;
  public showChangeList: boolean;
  public noChangesExisting: boolean = true;
  public noChangesReason: string;
  public totalAmountOfChange: number;
  public previousXmlIdentifier: string;
  public currentXmlIdentifier: string;
  public changeListData: IDiffChangeListData = {
    removed: [],
    changed: [],
    added: [],
    layoutChanged: [],
  };
  public showSavedXml: boolean = true;

  private _notificationService: NotificationService;
  private _eventAggregator: EventAggregator;
  private _leftViewer: IBpmnModeler;
  private _rightViewer: IBpmnModeler;
  private _lowerViewer: IBpmnModeler;
  private _diffModeler: IBpmnModeler;
  private _modeling: IModeling;
  private _elementRegistry: IElementRegistry;
  private _subscriptions: Array<Subscription>;
  private _elementNameService: ElementNameService;
  private _diffDestination: string = 'lastSaved';
  private _diagramName: string | undefined;
  private _solutionService: SolutionService;

  constructor(
    notificationService: NotificationService,
    eventAggregator: EventAggregator,
    solutionService: SolutionService,
  ) {
    this._notificationService = notificationService;
    this._eventAggregator = eventAggregator;
    this._elementNameService = new ElementNameService();
    this._solutionService = solutionService;
  }

  public created(): void {
    this._leftViewer = this._createNewViewer();
    this._rightViewer = this._createNewViewer();
    this._lowerViewer = this._createNewViewer();

    this._diffModeler = new bundle.modeler();

    this._modeling = this._diffModeler.get('modeling');
    this._elementRegistry = this._diffModeler.get('elementRegistry');

    this._startSynchronizingViewers();
  }

  public async attached(): Promise<void> {
    this._leftViewer.attachTo(this.leftCanvasModel);
    this._rightViewer.attachTo(this.rightCanvasModel);
    this._lowerViewer.attachTo(this.lowerCanvasModel);

    this._syncAllViewers();
    await this._updateXmlChanges();

    this._subscriptions = [
      this._eventAggregator.subscribe(environment.events.diffView.changeDiffMode, (diffMode: DiffMode) => {
        this.currentDiffMode = diffMode;

        this._updateDiffView();
      }),

      this._eventAggregator.subscribe(environment.events.diffView.toggleChangeList, () => {
        this.showChangeList = !this.showChangeList;
      }),

      this._eventAggregator.subscribe(environment.events.diffView.setDiffDestination, async (data: Array<string>) => {
        [this._diffDestination, this._diagramName] = data;

        const diffLastSavedXml: boolean = this._diffDestination === 'lastSaved';
        if (diffLastSavedXml) {
          this._setSavedProcessModelAsPreviousXml();
        } else {
          const updatingDeployedXmlWasSuccessful: boolean = await this._updateDeployedXml();
          const diagramNameIsSet: boolean = this._diagramName !== undefined;

          if (updatingDeployedXmlWasSuccessful && diagramNameIsSet) {
            this._setCustomProcessModelAsPreviousXml();

            return;
          }

          if (updatingDeployedXmlWasSuccessful) {
            this._setDeployedProcessModelAsPreviousXml();
          }
        }
      }),
    ];

    this._updateDiffView();
  }

  public detached(): void {
    for (const subscription of this._subscriptions) {
      subscription.dispose();
    }
  }

  public async currentXmlChanged(): Promise<void> {
    this._importXml(this.currentXml, this._leftViewer);

    await this._updateXmlChanges();
    this._updateDiffView();
  }

  public savedXmlChanged(): void {
    if (this.showSavedXml) {
      this._setSavedProcessModelAsPreviousXml();
    }
  }

  public async processModelIdChanged(): Promise<void> {
    const hasNoProcessModelId: boolean = this.processModelId === undefined;

    if (hasNoProcessModelId) {
      this.deployedXml = undefined;

      return;
    }

    const updatingDeploydedXmlWasSuccessfull: boolean = await this._updateDeployedXml();
    if (updatingDeploydedXmlWasSuccessfull) {
      return;
    }

    this._diffDestination = 'lastSaved';
    this._setSavedProcessModelAsPreviousXml();
  }

  public deployedXmlChanged(): void {
    const processModelIsDeployed: boolean = this.deployedXml !== undefined;

    this._eventAggregator.publish(environment.events.bpmnio.showDiffDestinationButton, processModelIsDeployed);
  }

  public async previousXmlChanged(): Promise<void> {
    this._importXml(this.previousXml, this._rightViewer);

    await this._updateXmlChanges();
    this._updateDiffView();
  }

  public togglePreviousXml(): void {
    this.showSavedXml = !this.showSavedXml;

    if (this.showSavedXml) {
      this._setSavedProcessModelAsPreviousXml();
    } else {
      this._setDeployedProcessModelAsPreviousXml();
    }
  }

  @computedFrom('currentDiffMode')
  public get diffModeIsNewVsOld(): boolean {
    return this.currentDiffMode === DiffMode.NewVsOld;
  }

  @computedFrom('currentDiffMode')
  public get diffModeIsOldVsNew(): boolean {
    return this.currentDiffMode === DiffMode.OldVsNew;
  }

  private _syncAllViewers(): void {
    const lowerCanvas: ICanvas = this._lowerViewer.get('canvas');
    const leftCanvas: ICanvas = this._leftViewer.get('canvas');
    const rightCanvas: ICanvas = this._rightViewer.get('canvas');

    const changedViewbox: IViewbox = lowerCanvas.viewbox();
    leftCanvas.viewbox(changedViewbox);
    rightCanvas.viewbox(changedViewbox);
  }

  private _setDeployedProcessModelAsPreviousXml(): void {
    this.previousXml = this.deployedXml;

    this.previousXmlIdentifier = 'Deployed';
    this.currentXmlIdentifier = 'Filesystem';

    this._eventAggregator.publish(environment.events.statusBar.setXmlIdentifier, [
      this.previousXmlIdentifier,
      this.currentXmlIdentifier,
    ]);
  }

  private _setCustomProcessModelAsPreviousXml(): void {
    this.previousXml = this.deployedXml;

    this.previousXmlIdentifier = this._diagramName;
    this.currentXmlIdentifier = this.processModelId;

    this._eventAggregator.publish(environment.events.statusBar.setXmlIdentifier, [
      this.previousXmlIdentifier,
      this.currentXmlIdentifier,
    ]);

    this._diagramName = undefined;
  }

  private _setSavedProcessModelAsPreviousXml(): void {
    this.previousXml = this.savedXml;

    this.previousXmlIdentifier = 'Old';
    this.currentXmlIdentifier = 'New';

    this._eventAggregator.publish(environment.events.statusBar.setXmlIdentifier, [
      this.previousXmlIdentifier,
      this.currentXmlIdentifier,
    ]);
  }

  private async _updateDeployedXml(): Promise<boolean> {
    const activeSolutionEntry: ISolutionEntry = this._solutionService.getSolutionEntryForUri(this._diffDestination);

    const activeSolutionEntryNotFound: boolean = activeSolutionEntry === undefined;
    if (activeSolutionEntryNotFound) {
      return false;
    }

    const diagramName: string = this._diagramName ? this._diagramName : this.processModelId;

    const getXmlFromDeployed: () => Promise<string> = async (): Promise<string> => {
      try {
        const diagram: IDiagram = await activeSolutionEntry.service.loadDiagram(diagramName);

        const diagramFound: boolean = diagram !== undefined;

        return diagramFound ? diagram.xml : undefined;
      } catch {
        return undefined;
      }
    };

    this.deployedXml = await getXmlFromDeployed();
    const diagramIsNotDeployed: boolean = this.deployedXml === undefined;

    const diffingAgainstDeployed: boolean = this._diffDestination !== 'lastSaved';
    if (diagramIsNotDeployed && diffingAgainstDeployed) {
      const errorMessage: string =
        'Could not diff against the deployed version: This diagram is not deployed to the ProcessEngine.';
      this._notificationService.showNotification(NotificationType.ERROR, errorMessage);

      return false;
    }

    return true;
  }

  private async _updateXmlChanges(): Promise<void> {
    /**
     * TODO: This is a dirty fix, so that the model parser does not
     * get an undefined string.
     *
     * We need to find out, where this value gets set to undefined
     * and prevent this issue there.
     */
    const previousXmlIsNotDefined: boolean = this.previousXml === undefined;
    if (previousXmlIsNotDefined) {
      this.previousXml = this.currentXml;
    }

    const previousDefinitions: IDefinition = await this._getDefintionsFromXml(this.previousXml);
    const newDefinitions: IDefinition = await this._getDefintionsFromXml(this.currentXml);

    this.xmlChanges = diff(previousDefinitions, newDefinitions);
    this._prepareChangesForChangeList();
  }

  private async _getDefintionsFromXml(xml: string): Promise<any> {
    return new Promise((resolve: Function, reject: Function): void => {
      const moddle: IBpmnModdle = this._diffModeler.get('moddle');

      moddle.fromXML(xml, (error: Error, definitions: IDefinition) => {
        if (error) {
          reject(error);
        }

        resolve(definitions);
      });
    });
  }

  private _getChangeListEntriesFromChanges(elementChanges: object): Array<IChangeListEntry> {
    const changeListEntries: Array<IChangeListEntry> = [];
    const elementIds: Array<string> = Object.keys(elementChanges);

    for (const elementId of elementIds) {
      const elementChange: IElementChange = elementChanges[elementId];

      const isTypeInModel: boolean = elementChange.$type === undefined;
      const changeListEntry: IChangeListEntry = isTypeInModel
        ? this._createChangeListEntry(elementChange.model.name, elementChange.model.$type)
        : this._createChangeListEntry(elementChange.name, elementChange.$type);

      changeListEntries.push(changeListEntry);
    }

    return changeListEntries;
  }

  /*
   * This function converts the object from the bpmn-differ into an object with arrays
   * to make it loopable in the html.
   */
  private _prepareChangesForChangeList(): void {
    this.changeListData.removed = [];
    this.changeListData.changed = [];
    this.changeListData.added = [];
    this.changeListData.layoutChanged = [];

    const changedElement: object = this._removeElementsWithoutChanges(this.xmlChanges._changed);

    this.changeListData.removed = this._getChangeListEntriesFromChanges(this.xmlChanges._removed);
    this.changeListData.changed = this._getChangeListEntriesFromChanges(changedElement);
    this.changeListData.added = this._getChangeListEntriesFromChanges(this.xmlChanges._added);
    this.changeListData.layoutChanged = this._getChangeListEntriesFromChanges(this.xmlChanges._layoutChanged);

    this.totalAmountOfChange =
      this.changeListData.removed.length +
      this.changeListData.changed.length +
      this.changeListData.added.length +
      this.changeListData.layoutChanged.length;

    this.noChangesExisting = this.totalAmountOfChange === 0;

    if (this.noChangesExisting) {
      this._setNoChangesReason();
    } else {
      this.noChangesReason = '';
    }
  }

  private _setNoChangesReason(): void {
    /*
     * This Regex removes all newlines and spaces to make sure that both xml
     * are not formatted.
     */
    const whitespaceAndNewLineRegex: RegExp = /\r?\n|\r|\s/g;

    const unformattedXml: string = this.currentXml.replace(whitespaceAndNewLineRegex, '');
    const unformattedSaveXml: string = this.previousXml.replace(whitespaceAndNewLineRegex, '');

    const diagramIsUnchanged: boolean = unformattedSaveXml === unformattedXml;

    if (diagramIsUnchanged) {
      this.noChangesReason = 'The two diagrams are identical.';
    } else {
      this.noChangesReason = 'The two diagrams are incomparable.';
    }
  }

  private _createChangeListEntry(elementName: string, elementType: string): IChangeListEntry {
    const humanReadableElementName: string = this._elementNameService.getHumanReadableName(elementName);
    const humanReadableElementType: string = this._elementNameService.getHumanReadableType(elementType);

    const changeListEntry: IChangeListEntry = {
      name: humanReadableElementName,
      type: humanReadableElementType,
    };

    return changeListEntry;
  }

  private _markAddedElements(addedElements: object): void {
    const elementsToColor: Array<IShape> = this._getElementsToColor(addedElements);

    this._colorElements(elementsToColor, defaultBpmnColors.green);
  }

  private _markRemovedElements(deletedElements: object): void {
    const elementsToColor: Array<IShape> = this._getElementsToColor(deletedElements);

    this._colorElements(elementsToColor, defaultBpmnColors.red);
  }

  private _startSynchronizingViewers(): void {
    const lowerCanvas: ICanvas = this._lowerViewer.get('canvas');
    const leftCanvas: ICanvas = this._leftViewer.get('canvas');
    const rightCanvas: ICanvas = this._rightViewer.get('canvas');

    this._setEventFunctions(lowerCanvas, leftCanvas, rightCanvas);
    this._setEventFunctions(leftCanvas, rightCanvas, lowerCanvas);
    this._setEventFunctions(rightCanvas, lowerCanvas, leftCanvas);
  }

  private _setEventFunctions(changingCanvas: ICanvas, firstCanvas: ICanvas, secondCanvas: ICanvas): void {
    const changingCanvasContainer: HTMLElement = changingCanvas._container;

    const adjustViewboxes: IEventFunction = (): void => {
      const changedViewbox: IViewbox = changingCanvas.viewbox();
      firstCanvas.viewbox(changedViewbox);
      secondCanvas.viewbox(changedViewbox);
    };

    const startCheckingForMouseMovement: IEventFunction = (): void => {
      window.onmousemove = adjustViewboxes;
    };
    const stopCheckingForMousemovement: IEventFunction = (): void => {
      window.onmousemove = null;
    };

    changingCanvasContainer.onwheel = adjustViewboxes;
    changingCanvasContainer.onmousedown = startCheckingForMouseMovement;
    changingCanvasContainer.onmouseup = stopCheckingForMousemovement;
  }

  private _markLayoutChangedElements(layoutChangedElements: object): void {
    const elementsToColor: Array<IShape> = this._getElementsToColor(layoutChangedElements);

    this._colorElements(elementsToColor, defaultBpmnColors.purple);
  }

  private _markChangedElements(changedElements: object): void {
    const changedElementsWithChanges: object = this._removeElementsWithoutChanges(changedElements);

    const elementsToColor: Array<IShape> = this._getElementsToColor(changedElementsWithChanges);

    this._colorElements(elementsToColor, defaultBpmnColors.orange);
  }

  /*
   * This function removes all elements without any changes from the changedElement object
   * and returns an object without these elements.
   *
   *  This is needed because the diff function always adds the start event
   *  to the changed Elements even though it has no changes.
   *
   * @param changedElement The _changed object of the object that gets returned by the bpmn-differ.
   * @returns The same object without the elements that did not get changed.
   */
  private _removeElementsWithoutChanges(changedElements: object): object {
    for (const elementId in changedElements) {
      const currentElementHasNoChanges: boolean = Object.keys(changedElements[elementId].attrs).length === 0;

      if (currentElementHasNoChanges) {
        delete changedElements[elementId];
      }
    }

    return changedElements;
  }

  private _updateDiffView(): void {
    if (this.diffModeIsNewVsOld) {
      this._updateLowerDiff(this.currentXml);
    } else if (this.diffModeIsOldVsNew) {
      this._updateLowerDiff(this.previousXml);
    }
  }

  private async _updateLowerDiff(xml: string): Promise<void> {
    const xmlIsNotLoaded: boolean = xml === undefined || xml === null;

    if (xmlIsNotLoaded) {
      const notificationMessage: string =
        'The xml could not be loaded. Please try to reopen the Diff View or reload the Detail View.';
      this._notificationService.showNotification(NotificationType.ERROR, notificationMessage);

      return;
    }

    const addedElements: Object = this.xmlChanges._added;
    const removedElements: object = this.xmlChanges._removed;
    const changedElements: object = this.xmlChanges._changed;
    const layoutChangedElements: object = this.xmlChanges._layoutChanged;

    const diffModeIsCurrentVsPrevious: boolean = this.currentDiffMode === DiffMode.NewVsOld;

    await this._importXml(xml, this._diffModeler);
    this._clearColors();

    this._markLayoutChangedElements(layoutChangedElements);
    this._markChangedElements(changedElements);

    if (diffModeIsCurrentVsPrevious) {
      this._markAddedElements(addedElements);
    } else {
      this._markRemovedElements(removedElements);
    }

    const coloredXml: string = await this._getXmlFromModeler();
    await this._importXml(coloredXml, this._lowerViewer);
  }

  private async _importXml(xml: string, viewer: IBpmnModeler): Promise<void> {
    const xmlIsNotLoaded: boolean = xml === undefined || xml === null;

    if (xmlIsNotLoaded) {
      const notificationMessage: string =
        'The xml could not be loaded. Please try to reopen the Diff View or reload the Detail View.';
      this._notificationService.showNotification(NotificationType.ERROR, notificationMessage);

      return;
    }

    const xmlImportPromise: Promise<void> = new Promise((resolve: Function, reject: Function): void => {
      viewer.importXML(xml, (importXmlError: Error) => {
        if (importXmlError) {
          reject(importXmlError);

          return;
        }

        this._fitDiagramToViewport(viewer);

        resolve();
      });
    });

    return xmlImportPromise;
  }

  private _fitDiagramToViewport(viewer: IBpmnModeler): void {
    const canvas: ICanvas = viewer.get('canvas');
    const viewbox: IViewbox = canvas.viewbox();
    const diagramIsVisible: boolean = viewbox.height > 0 && viewbox.width > 0;

    if (diagramIsVisible) {
      canvas.zoom('fit-viewport', 'auto');
    }
  }

  private async _getXmlFromModeler(): Promise<string> {
    const saveXmlPromise: Promise<string> = new Promise((resolve: Function, reject: Function): void => {
      const xmlSaveOptions: IBpmnXmlSaveOptions = {
        format: true,
      };

      this._diffModeler.saveXML(xmlSaveOptions, async (saveXmlError: Error, xml: string) => {
        if (saveXmlError) {
          reject(saveXmlError);

          return;
        }

        resolve(xml);
      });
    });

    return saveXmlPromise;
  }

  private _createNewViewer(): IBpmnModeler {
    return new bundle.viewer({
      additionalModules: [bundle.ZoomScrollModule, bundle.MoveCanvasModule],
    });
  }

  private _getElementsToColor(elements: object): Array<IShape> {
    const elementsToColor: Array<IShape> = [];

    for (const elementId in elements) {
      const currentElement: IShape = this._elementRegistry.get(elementId);

      elementsToColor.push(currentElement);
    }

    return elementsToColor;
  }

  private _clearColors(): void {
    const elementsToColor: Array<IShape> = this._elementRegistry.filter((element: IShape): boolean => {
      const elementHasFillColor: boolean = element.businessObject.di.fill !== undefined;
      const elementHasBorderColor: boolean = element.businessObject.di.stroke !== undefined;

      const elementHasColor: boolean = elementHasFillColor || elementHasBorderColor;

      return elementHasColor;
    });

    this._colorElements(elementsToColor, defaultBpmnColors.none);
  }

  private _colorElements(elementsToColor: Array<IShape>, color: IColorPickerColor): void {
    const noElementsToColorize: boolean = elementsToColor.length === 0;

    if (noElementsToColorize) {
      return;
    }

    this._modeling.setColor(elementsToColor, {
      stroke: color.border,
      fill: color.fill,
    });
  }
}
