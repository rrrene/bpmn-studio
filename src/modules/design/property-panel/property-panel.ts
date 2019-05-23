import {bindable} from 'aurelia-framework';

import {IModdleElement, IShape} from '@process-engine/bpmn-elements_contracts';

import {
  IBpmnModdle,
  IBpmnModeler,
  IDefinition,
  IElementRegistry,
  IEvent,
  IEventBus,
  IIndextab,
} from '../../../contracts';
import {Extensions} from './indextabs/extensions/extensions';
import {Forms} from './indextabs/forms/forms';
import {General} from './indextabs/general/general';

export class PropertyPanel {

  @bindable() public modeler: IBpmnModeler;
  @bindable() public xml: string;
  @bindable() public diagramUri: string;
  @bindable() public isEditable: boolean;
  public elementInPanel: IShape;
  public generalIndextab: IIndextab = new General();
  public formsIndextab: IIndextab = new Forms();
  public extensionsIndextab: IIndextab = new Extensions();
  public indextabs: Array<IIndextab>;

  private _moddle: IBpmnModdle;
  private _eventBus: IEventBus;
  private _currentIndextabTitle: string = this.generalIndextab.title;

  public attached(): void {
    this._moddle = this.modeler.get('moddle');
    this._eventBus = this.modeler.get('eventBus');

    this.indextabs = [
      this.generalIndextab,
      this.formsIndextab,
      this.extensionsIndextab,
    ];

    this.updateIndexTabsSuitability();
    this.checkIndexTabSuitability();

    this._eventBus.on(['element.click', 'shape.changed', 'selection.changed'], (event: IEvent) => {
      const elementWasClickedOn: boolean = event.type === 'element.click';
      const elementIsValidShape: boolean = event.type === 'shape.changed' && event.element.type !== 'label';

      const elementIsShapeInPanel: boolean = elementIsValidShape && event.element.id === this.elementInPanel.id;

      if (elementWasClickedOn || elementIsShapeInPanel) {
        this.elementInPanel = event.element;
      }

      const selectedElementChanged: boolean = event.type === 'selection.changed' && event.newSelection.length !== 0;

      if (selectedElementChanged) {
        this.elementInPanel = event.newSelection[0];
      }

      this.updateIndexTabsSuitability();
      this.checkIndexTabSuitability();
    });

    this.setFirstElement();
  }

  public updateIndextab(selectedIndextab: IIndextab): void {
    this._currentIndextabTitle = selectedIndextab.title;
  }

  private setFirstElement(): void {
    let firstElement: IModdleElement;

    this._moddle.fromXML(this.xml, ((err: Error, definitions: IDefinition): void => {
      const process: IModdleElement = definitions.rootElements.find((element: IModdleElement) => {
        return element.$type === 'bpmn:Process';
      });

      const processHasFlowElements: boolean = process.flowElements !== undefined && process.flowElements !== null;

      if (processHasFlowElements) {
        firstElement = process.flowElements.find((element: IModdleElement ) => {
          return element.$type === 'bpmn:StartEvent';
        });

        if (firstElement === undefined || firstElement === null) {
          firstElement = process.flowElements[0];
        }
      } else if (this.processHasLanes(process)) {
        firstElement = process.laneSets[0].lanes[0];
      }

      if (!firstElement) {
        firstElement = process;
      }

      const elementRegistry: IElementRegistry = this.modeler.get('elementRegistry');
      const elementInPanel: IShape = elementRegistry.get(firstElement.id);

      this.modeler.get('selection').select(elementInPanel);
    }));
  }

  private processHasLanes(process: IModdleElement): boolean {
    const processHasLaneSets: boolean = process.laneSets !== undefined && process.laneSets !== null;
    if (!processHasLaneSets) {
      return false;
    }

    const processHasLanes: boolean = process.laneSets[0].lanes !== undefined && process.laneSets[0].lanes !== null;

    return processHasLanes;
  }

  private updateIndexTabsSuitability(): void {
    for (const indextab of this.indextabs) {
      indextab.canHandleElement = indextab.isSuitableForElement(this.elementInPanel);
    }
  }

  private checkIndexTabSuitability(): void {
    const currentIndexTab: IIndextab = this.indextabs.find((indextab: IIndextab) => {
      return indextab.title === this._currentIndextabTitle;
    });

    if (!currentIndexTab.canHandleElement) {
      this._currentIndextabTitle = this.generalIndextab.title;
    }
  }

  public diagramUriChanged(newValue: string, oldValue: string): void {
    if (oldValue === undefined) {
      return;
    }

    // This is needed to make sure the xml was already imported into the modeler
    setTimeout(() => {
      this.setFirstElement();
    }, 0);
  }

}
