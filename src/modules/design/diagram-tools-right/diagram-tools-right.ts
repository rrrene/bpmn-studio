/* eslint-disable no-undef */
/* eslint-disable import/no-duplicates */
import {bindable, inject} from 'aurelia-framework';

import {IModdleElement, IShape} from '@process-engine/bpmn-elements_contracts';
import * as spectrum from 'spectrum-colorpicker';
import 'spectrum-colorpicker/spectrum';

import {
  ElementDistributeOptions,
  IBpmnFunction,
  IBpmnModeler,
  ICanvas,
  IColorPickerColor,
  IColorPickerSettings,
  IEvent,
  IEventFunction,
  IModeling,
  NotificationType,
  defaultBpmnColors,
} from '../../../contracts/index';
import environment from '../../../environment';
import {NotificationService} from '../../../services/notification-service/notification.service';

@inject('NotificationService')
export class DiagramToolsRight {
  @bindable()
  public modeler: IBpmnModeler;

  @bindable()
  public viewer: IBpmnModeler;

  @bindable()
  public solutionIsRemote: boolean;

  public colorSelectionDropdownToggle: HTMLElement;
  public colorSelectionDropdown: HTMLElement;

  public distributeElementsEnabled: boolean;
  public colorPickerEnabled: boolean = true;
  public colorPickerBorder: HTMLInputElement;
  public colorPickerFill: HTMLInputElement;
  public colorPickerLoaded: boolean = false;
  public fillColor: string;
  public borderColor: string;

  private preventColorSelectionFromHiding: boolean;

  private notificationService: NotificationService;

  constructor(notificationService: NotificationService) {
    this.notificationService = notificationService;
  }

  public attached(): void {
    this.distributeElementsEnabled = false;

    /**
     * Subscribe to the "selection.changed" event to determine, if the ColorPicker
     * should be enabled or not.
     *
     * The ColorPicker should only be enabled, if the user selects a Diagram
     * Element inside a Collaboration.
     */
    this.modeler.on('selection.changed', (event: IEvent) => {
      const selectedElements: Array<IShape> = this.getSelectedElements();
      const userSelectedDiagramElement: boolean = selectedElements.length > 0;

      this.colorPickerEnabled = this.solutionIsRemote ? false : userSelectedDiagramElement;

      if (userSelectedDiagramElement) {
        this.borderColor = selectedElements[0].businessObject.di.stroke;
        this.fillColor = selectedElements[0].businessObject.di.fill;
      }

      /**
       * The distribute elements feature only can do it's thing, if the
       * user selects more than two elements.
       */
      this.distributeElementsEnabled = selectedElements.length > 2;
    });

    /**
     * Subscribe to the "commandStack.elements.move.postExecute" event.
     *
     * This is needed because otherwise the colorpicker stays disabled if the
     * user directly drags around an element after he clicked at a Collaboration.
     */
    this.modeler.on('commandStack.elements.move.postExecute', (event: IEvent) => {
      this.colorPickerEnabled = true;
    });
  }

  public detached(): void {
    $(this.colorPickerBorder).spectrum('destroy');
    $(this.colorPickerFill).spectrum('destroy');

    window.localStorage.removeItem('borderColors');
    window.localStorage.removeItem('fillColors');
  }

  public setColorRed(): void {
    this.setColor(defaultBpmnColors.red);
  }

  public setColorBlue(): void {
    this.setColor(defaultBpmnColors.blue);
  }

  public setColorGreen(): void {
    this.setColor(defaultBpmnColors.green);
  }

  public setColorPurple(): void {
    this.setColor(defaultBpmnColors.purple);
  }

  public setColorOrange(): void {
    this.setColor(defaultBpmnColors.orange);
  }

  public removeColor(): void {
    this.setColor(defaultBpmnColors.none);
  }

  public setPickedColor(): void {
    const customColor: IColorPickerColor = {fill: this.fillColor, border: this.borderColor};

    this.setColor(customColor);
  }

  public updateCustomColors(): void {
    if (!this.colorPickerLoaded) {
      this.activateColorPicker();
    }

    [this.fillColor, this.borderColor] = this.getColors();

    $(this.colorPickerFill).spectrum('set', this.fillColor);
    $(this.colorPickerBorder).spectrum('set', this.borderColor);
  }

  public fitDiagramToViewport(): void {
    if (this.solutionIsRemote) {
      const viewerCanvas: ICanvas = this.viewer.get('canvas');

      viewerCanvas.zoom('fit-viewport', 'auto');
    } else {
      const modelerCanvas: ICanvas = this.modeler.get('canvas');

      modelerCanvas.zoom('fit-viewport', 'auto');
    }
  }

  private setColor(color: IColorPickerColor): void {
    const modeling: IModeling = this.modeler.get('modeling');

    const selectedElements: Array<IShape> = this.getSelectedElements();

    const elementIsNotValid: boolean =
      selectedElements.length < 1 ||
      (selectedElements.length === 1 && selectedElements[0].$type === 'bpmn:Collaboration');

    if (elementIsNotValid) {
      const notificationMessage: string =
        'Unable to apply color. Please select an element and use the color picker again.';
      this.notificationService.showNotification(NotificationType.INFO, notificationMessage);

      return;
    }

    this.fillColor = color.fill;
    this.borderColor = color.border;

    modeling.setColor(selectedElements, {
      fill: color.fill,
      stroke: color.border,
    });
  }

  private getColors(): Array<string> {
    const selectedElements: Array<IShape> = this.getSelectedElements();

    const noElementSelected: boolean = !selectedElements || !selectedElements[0] || !selectedElements[0].businessObject;

    if (noElementSelected) {
      const undefinedFillColorUndefinedBorderColor: Array<string> = [undefined, undefined];
      return undefinedFillColorUndefinedBorderColor;
    }

    const firstElement: IModdleElement = selectedElements[0].businessObject;
    const fillColor: string = firstElement.di.fill;
    const borderColor: string = firstElement.di.stroke;

    return [fillColor, borderColor];
  }

  public distributeElementsVertically(): void {
    const distributor: IBpmnFunction = this.modeler.get('distributeElements');

    const elements: Array<IShape> = this.getSelectedElements();

    distributor.trigger(elements, ElementDistributeOptions.VERTICAL);
  }

  public distributeElementsHorizontally(): void {
    const distributor: IBpmnFunction = this.modeler.get('distributeElements');

    const elements: Array<IShape> = this.getSelectedElements();

    distributor.trigger(elements, ElementDistributeOptions.HORIZONTAL);
  }

  private activateColorPicker(): void {
    window.localStorage.removeItem('borderColors');
    window.localStorage.removeItem('fillColors');

    // Colorpicker bordercolor
    const borderMoveSetting: spectrum.Options = {
      move: (borderColor: spectrum.tinycolorInstance): void => {
        this.updateBorderColor(borderColor);
      },
    };

    const borderLocalStorageKey: spectrum.Options = {localStorageKey: 'borderColors'};

    const borderDefaultColors: Array<string> = [
      defaultBpmnColors.red.border,
      defaultBpmnColors.blue.border,
      defaultBpmnColors.green.border,
      defaultBpmnColors.purple.border,
      defaultBpmnColors.orange.border,
    ];

    const borderDefaultPalette: spectrum.Options = {palette: borderDefaultColors};

    const colorPickerBorderSettings: IColorPickerSettings = Object.assign(
      {},
      environment.colorPickerSettings,
      borderDefaultPalette,
      borderLocalStorageKey,
      borderMoveSetting,
    );

    $(this.colorPickerBorder).spectrum(colorPickerBorderSettings);

    // Colorpicker fillcolor
    const fillMoveSetting: spectrum.Options = {
      move: (fillColor: spectrum.tinycolorInstance): void => {
        this.updateFillColor(fillColor);
      },
    };

    const fillLocalStorageKey: spectrum.Options = {localStorageKey: 'fillColors'};

    const fillDefaultColors: Array<string> = [
      defaultBpmnColors.red.fill,
      defaultBpmnColors.blue.fill,
      defaultBpmnColors.green.fill,
      defaultBpmnColors.purple.fill,
      defaultBpmnColors.orange.fill,
    ];

    const fillDefaultPalette: spectrum.Options = {palette: fillDefaultColors};

    const colorPickerFillSettings: IColorPickerSettings = Object.assign(
      {},
      environment.colorPickerSettings,
      fillDefaultPalette,
      fillLocalStorageKey,
      fillMoveSetting,
    );

    $(this.colorPickerFill).spectrum(colorPickerFillSettings);

    const changeColorSelectionHiding: (event: JQueryEventObject) => void = (event: Event): void => {
      const isDragStartEvent: boolean = event.type === 'dragstart';

      this.preventColorSelectionFromHiding = isDragStartEvent;
      if (isDragStartEvent) {
        document.addEventListener('click', this.colorSelectionDropdownClickListener);
      }
    };

    // This is used to prevent the color selection dropdown from hiding when a colorpicker is still visible
    $(this.colorPickerFill).on('dragstart.spectrum', changeColorSelectionHiding);
    $(this.colorPickerBorder).on('dragstart.spectrum', changeColorSelectionHiding);

    $(this.colorPickerFill).on('dragstop.spectrum', changeColorSelectionHiding);
    $(this.colorPickerBorder).on('dragstop.spectrum', changeColorSelectionHiding);

    this.colorPickerLoaded = true;
  }

  private updateFillColor(fillColor: spectrum.tinycolorInstance): void {
    if (fillColor) {
      this.fillColor = fillColor.toHexString();
    } else {
      this.fillColor = undefined;
    }

    this.setPickedColor();
  }

  private updateBorderColor(borderColor: spectrum.tinycolorInstance): void {
    if (borderColor) {
      this.borderColor = borderColor.toHexString();
    } else {
      this.borderColor = undefined;
    }

    this.setPickedColor();
  }

  private getSelectedElements(): Array<IShape> {
    // eslint-disable-next-line no-underscore-dangle
    return this.modeler.get('selection')._selectedElements;
  }

  public colorSelectionDropdownClickListener: IEventFunction = (): void => {
    if (this.preventColorSelectionFromHiding) {
      this.colorSelectionDropdown.classList.add('color-selection-dropdown--show');
      this.preventColorSelectionFromHiding = false;
    } else {
      this.colorSelectionDropdown.classList.remove('color-selection-dropdown--show');
      document.removeEventListener('click', this.colorSelectionDropdownClickListener);
    }
  };
}
