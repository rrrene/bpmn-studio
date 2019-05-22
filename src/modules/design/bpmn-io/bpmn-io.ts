
import {EventAggregator, Subscription} from 'aurelia-event-aggregator';
import {bindable, bindingMode, inject, observable} from 'aurelia-framework';

import {IModdleElement, IProcessRef, IPropertiesElement, IShape} from '@process-engine/bpmn-elements_contracts';
import * as bundle from '@process-engine/bpmn-js-custom-bundle';
import * as bpmnlintConfig from '@process-engine/bpmn-lint_rules';

import {
  IBpmnModeler,
  IBpmnXmlSaveOptions,
  ICanvas,
  IDiagramExportService,
  IDiagramPrintService,
  IEditorActions,
  IElementRegistry,
  IEvent,
  IEventFunction,
  IInternalEvent,
  IKeyboard,
  ILinting,
  IValidateIssue,
  IValidateIssueCategory,
  IValidateResult,
  IViewbox,
  NotificationType,
} from '../../../contracts/index';
import environment from '../../../environment';
import {NotificationService} from '../../../services/notification-service/notification.service';
import {DiagramExportService, DiagramPrintService} from './services/index';

const sideBarRightSize: number = 35;
const elementRegistryTimeoutMilliseconds: number = 50;

@inject('NotificationService', EventAggregator)
export class BpmnIo {
  public modeler: IBpmnModeler;
  public viewer: IBpmnModeler;

  public resizeButton: HTMLButtonElement;
  public canvasModel: HTMLDivElement;
  public propertyPanel: HTMLElement;
  @bindable({changeHandler: 'diagramChanged'}) public diagramUri: string;
  @bindable({defaultBindingMode: bindingMode.twoWay}) public xml: string;
  @bindable({changeHandler: 'nameChanged'}) public name: string;
  @observable public propertyPanelWidth: number;
  public showLinter: boolean;
  public solutionIsRemote: boolean = false;
  public savedXml: string;
  public showPropertyPanel: boolean = false;
  public colorPickerLoaded: boolean = false;
  public minCanvasWidth: number = 100;
  public minPropertyPanelWidth: number = 200;
  public diagramIsInvalid: boolean = false;
  public diagramHasChanged: boolean = false;

  private _bpmnLintButton: HTMLElement;
  private _linting: ILinting;

  private _propertyPanelShouldOpen: boolean = false;
  private _propertyPanelHiddenForSpaceReasons: boolean = false;
  private _propertyPanelHasNoSpace: boolean = false;

  private _notificationService: NotificationService;
  private _eventAggregator: EventAggregator;
  private _subscriptions: Array<Subscription>;
  private _diagramExportService: IDiagramExportService;
  private _diagramPrintService: IDiagramPrintService;

  private _tempProcess: IProcessRef;
  private _diagramHasChanges: boolean = false;
  /**
   * We are using the direct reference of a container element to place the tools of bpmn-js
   * in the left sidebar (bpmn-io-layout__tools-left).
   *
   * This needs to be refactored.
   * To get more control over certain elements in the palette it would be nice to have
   * an aurelia-component for handling the logic behind it.
   *
   * TODO: https://github.com/process-engine/bpmn-studio/issues/455
   */
  public paletteContainer: HTMLDivElement;

  constructor(notificationService: NotificationService, eventAggregator: EventAggregator) {
    this._notificationService = notificationService;
    this._eventAggregator = eventAggregator;
  }

  public created(): void {
    this.modeler = new bundle.modeler({
      additionalModules: [
        bundle.MiniMap,
        bundle.ZoomScrollModule,
        bundle.MoveCanvasModule,
        bundle.resizeAllModule,
        bundle.lintModule,
      ],
      linting: {
        bpmnlint: bpmnlintConfig,
      },
      moddleExtensions: {
        camunda: bundle.camundaModdleDescriptor,
      },
      keyboard: {
        bindTo: document,
      },
    });

    this._linting = this.modeler.get('linting');

    /**
     * Subscribe to the "elements.paste.rejected"-event to show a helpful
     * message to the user.
     */
    this.modeler.on('elements.paste.rejected', () => {
      this._notificationService
        .showNotification(NotificationType.INFO, 'In order to paste an element you have to place your cursor outside of the element.');
    });

    this._addRemoveWithBackspaceKeyboardListener();

    /**
     * Subscribe to "commandStack.changed"-event to have a simple indicator of
     * when a diagram is changed.
     */
    const handlerPriority: number = 1000;

    this.modeler.on('commandStack.changed', async() => {
      if (!this.solutionIsRemote) {
        this._eventAggregator.publish(environment.events.diagramChange);
      }

      this.xml = await this.getXML();
    }, handlerPriority);

    this.modeler.on(['shape.added', 'shape.removed'], (event: IInternalEvent) => {
      if (!this.solutionIsRemote) {

        const shapeIsParticipant: boolean = event.element.type === 'bpmn:Participant';

        if (shapeIsParticipant) {
          return this._checkForMultipleParticipants(event);
        }
      }
    });

    this.modeler.on('import.done', async() => {
      this._fitDiagramToViewport();

      if (!this.solutionIsRemote) {
        await this._validateDiagram();
        this._linting.update();
      }
    }, 1);

    this.modeler.on('shape.remove', (event: IInternalEvent) => {
      if (!this.solutionIsRemote) {
        const shapeIsParticipant: boolean = event.element.type === 'bpmn:Participant';
        if (shapeIsParticipant) {
          const rootElements: Array<IProcessRef> = this.modeler._definitions.rootElements;
          this._tempProcess = rootElements.find((element: IProcessRef) => {
            return element.$type === 'bpmn:Process';
          });

          return event;
        }
      }
    });

    this.modeler.on('element.paste', (event: IInternalEvent) => {
      if (!this.solutionIsRemote) {
        const elementToPasteIsUserTask: boolean = event.descriptor.type === 'bpmn:UserTask';
        if (elementToPasteIsUserTask) {
          return this._renameFormFields(event);
        }
      }
    });

    this._diagramPrintService = new DiagramPrintService();
    this._diagramExportService = new DiagramExportService();
  }

  public async attached(): Promise<void> {
    const xmlIsEmpty: boolean = this.xml !== undefined && this.xml !== null;
    if (xmlIsEmpty) {
      this.modeler.importXML(this.xml, async(err: Error) => {
        this.savedXml = await this.getXML();
      });

      // Wait until the HTML is rendered
      setTimeout(() => {
        this._bpmnLintButton = document.querySelector('.bpmn-js-bpmnlint-button');

        if (this._bpmnLintButton) {
          this._bpmnLintButton.style.display = 'none';
        }
      }, 0);
    }

    if (this.solutionIsRemote) {
      this.viewer.importXML(this.xml);
      this.viewer.attachTo(this.canvasModel);
    } else {
      this.modeler.attachTo(this.canvasModel);

      this.attachPaletteContainer();
    }

    window.addEventListener('resize', this._resizeEventHandler);

    this.resizeButton.addEventListener('mousedown', (e: Event) => {
      const windowEvent: Event = e || window.event;
      windowEvent.cancelBubble = true;

      const mousemoveFunction: IEventFunction = (event: MouseEvent): void => {
        this.resize(event);
        document.getSelection().empty();
      };

      const mouseUpFunction: IEventFunction = (): void => {
        document.removeEventListener('mousemove', mousemoveFunction);
        document.removeEventListener('mouseup', mouseUpFunction);
      };

      document.addEventListener('mousemove', mousemoveFunction);
      document.addEventListener('mouseup', mouseUpFunction);
    });

    document.addEventListener('keydown', this._saveHotkeyEventHandler);
    document.addEventListener('keydown', this._printHotkeyEventHandler);

    this._hideOrShowPpForSpaceReasons();

    this._subscriptions = [
      this._eventAggregator.subscribe(environment.events.processSolutionPanel.toggleProcessSolutionExplorer, () => {
        this._hideOrShowPpForSpaceReasons();
      }),

      this._eventAggregator.subscribe(`${environment.events.diagramDetail.exportDiagramAs}:BPMN`, async() => {
        try {
          const exportName: string = `${this.name}.bpmn`;
          const xmlToExport: string = await this.getXML();

          await this._diagramExportService
            .loadXML(xmlToExport)
            .asBpmn()
            .export(exportName);
        } catch {
          this._notificationService.showNotification(NotificationType.ERROR, 'An error occurred while preparing the diagram for exporting');
        }
      }),

      this._eventAggregator.subscribe(`${environment.events.diagramDetail.exportDiagramAs}:SVG`, async() => {
        try {
          const exportName: string = `${this.name}.svg`;
          await this._diagramExportService
            .loadSVG(await this.getSVG())
            .asSVG()
            .export(exportName);
        } catch (error) {
          this._notificationService.showNotification(NotificationType.ERROR, 'An error occurred while preparing the diagram for exporting');
        }
      }),

      this._eventAggregator.subscribe(`${environment.events.diagramDetail.exportDiagramAs}:PNG`, async() => {
        try {
          const exportName: string = `${this.name}.png`;
          await this._diagramExportService
            .loadSVG(await this.getSVG())
            .asPNG()
            .export(exportName);
        } catch (error) {
          this._notificationService.showNotification(NotificationType.ERROR, 'An error occurred while preparing the diagram for exporting');
        }
      }),

      this._eventAggregator.subscribe(`${environment.events.diagramDetail.exportDiagramAs}:JPEG`, async() => {
        try {
          const exportName: string = `${this.name}.jpeg`;
          await this._diagramExportService
          .loadSVG(await this.getSVG())
          .asJPEG()
          .export(exportName);
        } catch (error) {
          this._notificationService.showNotification(NotificationType.ERROR, 'An error occurred while preparing the diagram for exporting');
        }
      }),

      this._eventAggregator.subscribe(`${environment.events.diagramDetail.printDiagram}`, async() => {
        await this._printHandler();
      }),

      this._eventAggregator.subscribe(environment.events.diagramDetail.saveDiagram, async() => {
        this.savedXml = await this.getXML();
      }),

      this._eventAggregator.subscribe(environment.events.diagramChange, async() => {
        /*
        * This Regex removes all newlines and spaces to make sure that both xml
        * are not formatted.
        */
        const whitespaceAndNewLineRegex: RegExp = /\r?\n|\r|\s/g;

        this.xml = await this.getXML();
        const unformattedXml: string = this.xml.replace(whitespaceAndNewLineRegex, '');
        const unformattedSaveXml: string = this.savedXml.replace(whitespaceAndNewLineRegex, '');

        const diagramIsChanged: boolean = unformattedSaveXml !== unformattedXml;

        this._validateDiagram();

        this._eventAggregator.publish(environment.events.differsFromOriginal, diagramIsChanged);
      }),

      this._eventAggregator.subscribe(environment.events.navBar.validationError, () => {
        this.diagramIsInvalid = true;
      }),

      this._eventAggregator.subscribe(environment.events.navBar.noValidationError, () => {
        this.diagramIsInvalid = false;
      }),

      this._eventAggregator.subscribe(environment.events.bpmnio.togglePropertyPanel, () => {
        this._togglePanel();
      }),

      this._eventAggregator.subscribe(environment.events.bpmnio.bindKeyboard, () => {
        const keyboard: IKeyboard = this.modeler.get('keyboard');

        const element: Document | any = document;
        keyboard.bind(element);
      }),

      this._eventAggregator.subscribe(environment.events.bpmnio.unbindKeyboard, () => {
        const keyboard: IKeyboard = this.modeler.get('keyboard');

        keyboard.unbind();
      }),

      this._eventAggregator.subscribe(environment.events.differsFromOriginal, (changes: boolean) => {
       this._diagramHasChanges = changes;
      }),
    ];

    const previousPropertyPanelWidth: string = window.localStorage.getItem('propertyPanelWidth');

    /*
     * Update the property panel width;
     * if no previous width was found, take the configured one.
     */
    this.propertyPanelWidth = (previousPropertyPanelWidth !== undefined) ?
                              parseInt(previousPropertyPanelWidth) :
                              environment.propertyPanel.defaultWidth;

    const propertyPanelHideState: string = window.localStorage.getItem('propertyPanelHideState');
    const wasPropertyPanelVisible: boolean = propertyPanelHideState === null || propertyPanelHideState === 'show';
    this._propertyPanelShouldOpen = wasPropertyPanelVisible;
    this._togglePanel();
  }

  public detached(): void {
    this.modeler.detach();
    this.modeler.destroy();
    window.removeEventListener('resize', this._resizeEventHandler);
    document.removeEventListener('keydown', this._saveHotkeyEventHandler);
    document.removeEventListener('keydown', this._printHotkeyEventHandler);

    for (const subscription of this._subscriptions) {
      subscription.dispose();
    }
  }

  public attachPaletteContainer(): void {
    const bpmnIoPaletteContainer: Element = document.getElementsByClassName('djs-palette')[0];

    bpmnIoPaletteContainer.className += ' djs-palette-override';
    this.paletteContainer.appendChild(bpmnIoPaletteContainer);
  }

  public async saveCurrentXML(): Promise<void> {
    this.savedXml = await this.getXML();
    this._tempProcess = undefined;
  }

  public xmlChanged(): void {
    if (this.diagramHasChanged) {
      if (this.solutionIsRemote) {
        this.viewer.importXML(this.xml);
      }

      this.modeler.importXML(this.xml);
    }

    this.diagramHasChanged = false;
  }

  public async diagramChanged(): Promise<void> {
    this.solutionIsRemote = this.diagramUri.startsWith('http');
    this._tempProcess = undefined;
    this.diagramHasChanged = true;

    if (this.solutionIsRemote) {
      const viewerNotInitialized: boolean = this.viewer === undefined;
      if (viewerNotInitialized) {
        this.viewer = new bundle.viewer({
          additionalModules:
          [
            bundle.ZoomScrollModule,
            bundle.MoveCanvasModule,
            bundle.MiniMap,
          ],
        });

        this.viewer.on('selection.changed', (event: IEvent) => {
          const nothingIsSelected: boolean = event.newSelection.length === 0;
          if (nothingIsSelected) {
            return;
          }

          const selectedElement: IShape = event.newSelection[0];
          const elementRegistry: IElementRegistry = this.modeler.get('elementRegistry');
          const modelerShape: IShape = elementRegistry.get(selectedElement.id);

          this.modeler.get('selection').select(modelerShape);
        });
      }

      setTimeout(() => {
        this.viewer.attachTo(this.canvasModel);
        this._linting.deactivateLinting();
      }, 0);

    } else {
      setTimeout(() => {
        this.modeler.attachTo(this.canvasModel);
        this.attachPaletteContainer();
        this._bpmnLintButton = document.querySelector('.bpmn-js-bpmnlint-button');

        if (this._bpmnLintButton) {

          this._bpmnLintButton.style.display = 'none';
        }
      }, 0);
    }
    this._diagramHasChanges = false;
  }

  public nameChanged(newValue: string): void {
    if (this.modeler !== undefined && this.modeler !== null) {
      this.name = newValue;
    }
  }

  public propertyPanelWidthChanged(newValue: number): void {
    if (newValue !== undefined) {
      window.localStorage.setItem('propertyPanelWidth', '' + this.propertyPanelWidth);
    }
  }

  private async _validateDiagram(): Promise<void> {
    const validationResult: IValidateResult = await this._linting.lint();
    this._linting.update();

    let validationResultContainsErrors: boolean = false;

    Object.entries(validationResult).forEach(([key, validationIssues]: [string, Array<IValidateIssue>]) => {
      const issuesContainError: boolean = validationIssues.some((issue: IValidateIssue) => {
        return issue.category === IValidateIssueCategory.error;
      });

      if (issuesContainError) {
        validationResultContainsErrors = true;
      }
    });

    const eventToPublish: string = validationResultContainsErrors
                                 ? environment.events.navBar.validationError
                                 : environment.events.navBar.noValidationError;

    this._eventAggregator.publish(eventToPublish);
  }

  public _togglePanel(): void {
    if (this._propertyPanelShouldOpen) {
      if (this._propertyPanelHasNoSpace) {
        this._notificationService.showNotification(NotificationType.ERROR, 'There is not enough space for the property panel!');
        return;
      }

      document.getElementById('toggleButtonPropertyPanel').classList.add('design-layout__tool--active');
      this.showPropertyPanel = true;
      this._eventAggregator.publish(environment.events.bpmnio.propertyPanelActive, true);
      this._propertyPanelShouldOpen = false;
      window.localStorage.setItem('propertyPanelHideState', 'show');
    } else {

      document.getElementById('toggleButtonPropertyPanel').classList.remove('design-layout__tool--active');
      this.showPropertyPanel = false;
      this._eventAggregator.publish(environment.events.bpmnio.propertyPanelActive, false);
      this._propertyPanelShouldOpen = true;
      window.localStorage.setItem('propertyPanelHideState', 'hide');
    }
  }

  public resize(event: MouseEvent): void {
    const mousePosition: number = event.clientX;

    this._setNewPropertyPanelWidthFromMousePosition(mousePosition);
  }

  public async getXML(): Promise<string> {
    const returnPromise: Promise<string> = new Promise((resolve: Function, reject: Function): void => {
      const xmlSaveOptions: IBpmnXmlSaveOptions = {
        format: true,
      };

      this.modeler.saveXML(xmlSaveOptions, (error: Error, result: string) => {
        if (error) {
          reject(error);

          return;
        }

        resolve(result);
      });
    });
    return returnPromise;
  }

  public toggleLinter(): void {
    this.showLinter = !this.showLinter;
    this._bpmnLintButton = document.querySelector('.bpmn-js-bpmnlint-button');

    if (this.showLinter) {
      this._bpmnLintButton.style.display = 'block';

      this._linting.activateLinting();
    } else {
      this._bpmnLintButton.style.display = 'none';

      this._linting.deactivateLinting();
    }
  }

  private _fitDiagramToViewport(): void {
    const modelerCanvas: ICanvas = this.modeler.get('canvas');
    const modelerViewbox: IViewbox  = modelerCanvas.viewbox();
    const modelerDiagramIsVisible: boolean = modelerViewbox.height > 0 && modelerViewbox.width > 0;

    if (this.solutionIsRemote) {
      const viewerCanvas: ICanvas = this.viewer.get('canvas');
      const viewerViewbox: IViewbox  = viewerCanvas.viewbox();
      const viewerDiagramIsVisible: boolean = viewerViewbox.height > 0 && viewerViewbox.width > 0;

      if (viewerDiagramIsVisible) {
        viewerCanvas.zoom('fit-viewport', 'auto');
      }
    } else {
      if (modelerDiagramIsVisible) {
        modelerCanvas.zoom('fit-viewport', 'auto');
      }
    }
  }

  private _renameFormFields(event: IInternalEvent): IInternalEvent {
    const allFields: Array<IPropertiesElement> = event.descriptor.businessObject.extensionElements.values;

    const formDataObject: IPropertiesElement = allFields.find((field: IModdleElement) => {
      return field.$type === 'camunda:FormData';
    });

    const noFieldsSpecified: boolean = formDataObject.fields === undefined
                                    || formDataObject.fields === null;
    if (noFieldsSpecified) {
      return;
    }

    formDataObject.fields.forEach((formField: IModdleElement) => {
      formField.id = `Form_${this._generateRandomId()}`;
    });

    return event;
  }

  private _generateRandomId(): string {
    let randomId: string = '';
    const possible: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    const randomIdLength: number = 8;
    for (let i: number = 0; i < randomIdLength; i++) {
      randomId += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return randomId;
  }

  private _checkForMultipleParticipants(event: IInternalEvent): IInternalEvent {
    const elementRegistry: IElementRegistry = this.modeler.get('elementRegistry');

    setTimeout(() => {
      const participants: Array<IShape> = elementRegistry.filter((element: IShape) => {
        return element.type === 'bpmn:Participant';
      });

      const multipleParticipants: boolean = participants.length > 1;

      if (this._diagramHasChanges) {
        participants.forEach((participant: IShape) => {
          participant.businessObject.processRef.id = this._tempProcess.id;
          participant.businessObject.processRef.isExecutable = this._tempProcess.isExecutable;
        });
      }

    }, elementRegistryTimeoutMilliseconds);

    return event;
  }

  private _setNewPropertyPanelWidthFromMousePosition(mousePosition: number): void {
    const propertyPanelMaxWidth: number = this.propertyPanel.parentElement.offsetWidth - this.minCanvasWidth;
    const mousePositionFromRight: number = document.body.clientWidth - mousePosition;
    const resizedWidth: number = mousePositionFromRight - sideBarRightSize;

    /*
     * This is needed to stop the width from increasing too far
     * the property panel would not be displayed with that width,
     * but when increasing the browser width, the property panel
     * then may also increase.
     */
    const newPropertyPanelWidth: number = Math.min(resizedWidth, propertyPanelMaxWidth);

    this.propertyPanelWidth = newPropertyPanelWidth;
  }

  private _hidePropertyPanelForSpaceReasons(): void {
    this._propertyPanelHasNoSpace = true;
    const propertyPanelIsOpen: boolean = !this._propertyPanelShouldOpen;

    if (propertyPanelIsOpen) {
      this._propertyPanelHiddenForSpaceReasons = true;
      this._togglePanel();
    }
  }

  private _showPropertyPanelForSpaceReasons(): void {
    this._propertyPanelHasNoSpace = false;
    this._propertyPanelHiddenForSpaceReasons = false;

    this._propertyPanelShouldOpen = true;
    this._togglePanel();
  }

  private _resizeEventHandler = (event: MouseEvent): void => {
    this._hideOrShowPpForSpaceReasons();

    const mousePosition: number = event.clientX;

    this._setNewPropertyPanelWidthFromMousePosition(mousePosition);
  }

  private _hideOrShowPpForSpaceReasons(): void {
    const minModelerWidthForPropertyPanel: number = this.minCanvasWidth + this.minPropertyPanelWidth;
    const modelerWidth: number = this.propertyPanel.parentElement.offsetWidth;

    if (modelerWidth === 0) {
      return;
    }

    this._propertyPanelHasNoSpace = modelerWidth < minModelerWidthForPropertyPanel;
    if (this._propertyPanelHasNoSpace) {
      this._hidePropertyPanelForSpaceReasons();
    } else if (this._propertyPanelHiddenForSpaceReasons) {
      this._showPropertyPanelForSpaceReasons();
    }
  }

  /**
   * Handles an incoming printDiagram message.
   */
  private async _printHandler(): Promise<void> {
    try {
      const svgToPrint: string = await this.getSVG();
      this._diagramPrintService.printDiagram(svgToPrint);
    } catch (error) {
      this._notificationService.showNotification(NotificationType.ERROR, `An error while trying to print the diagram occurred.`);
    }
  }

  /**
   * Handles a key down event and saves the diagram, if the user presses a CRTL + s key combination.
   *
   * If using macOS, this combination will be CMD + s.
   *
   * Saving is triggered by emitting @see environment.events.diagramDetail.saveDiagram
   *
   * @param event Passed key event.
   * @return void
   */
  private _saveHotkeyEventHandler = (event: KeyboardEvent): void  => {
    // On macOS the 'common control key' is the meta instead of the control key. So on a mac we need to find
    // out, if the meta key instead of the control key is pressed.
    const currentPlatformIsMac: boolean = this._checkIfCurrentPlatformIsMac();
    const metaKeyIsPressed: boolean = currentPlatformIsMac ? event.metaKey : event.ctrlKey;

    /*
    * If both keys (meta and s) are pressed, save the diagram.
    * A diagram is saved, by throwing a saveDiagram event.
    *
    * @see environment.events.diagramDetail.saveDiagram
    */
    const sKeyIsPressed: boolean = event.key === 's';
    const userDoesNotWantToSave: boolean = !(metaKeyIsPressed && sKeyIsPressed);

    if (userDoesNotWantToSave) {
      return;
    }

    // Prevent the browser from handling the default action for CTRL + s.
    event.preventDefault();

    this._eventAggregator.publish(environment.events.diagramDetail.saveDiagram);
  }

  /**
   * On macOS it is typically to remove elements with the backspace instead
   * of the delete key. This Method binds the removal of a selected
   * element to the backspace key, if the current platform is macOS.
   */
  private _addRemoveWithBackspaceKeyboardListener(): void {
    const currentPlatformIsNotMac: boolean = !this._checkIfCurrentPlatformIsMac();

    if (currentPlatformIsNotMac) {
      return;
    }

    const keyboard: IKeyboard = this.modeler.get('keyboard');
    const editorActions: IEditorActions = this.modeler.get('editorActions');
    const backSpaceKeyCode: number = 8;

    // tslint:disable-next-line:typedef
    const removeSelectedElements = (key: IInternalEvent, modifiers: KeyboardEvent): boolean => {
        const backspaceWasPressed: boolean = key.keyEvent.keyCode === backSpaceKeyCode;

        if (backspaceWasPressed) {
          editorActions.trigger('removeSelection');

          return true;
        }
      };

    keyboard.addListener(removeSelectedElements);
  }

  /**
   * Handles a key down event and prints the diagram, when the user presses CRTL + p.
   *
   * If using macOS, this combination will be CMD + p.
   *
   * Printing is triggered by emitting @see environment.events.diagramDetail.printDiagram
   *
   * @param event Passed key event.
   * @return void
   */
  private _printHotkeyEventHandler = (event: KeyboardEvent): void  => {
    // On macOS the 'common control key' is the meta instead of the control key. So on a mac we need to find
    // out, if the meta key instead of the control key is pressed.
    const currentPlatformIsMac: boolean = this._checkIfCurrentPlatformIsMac();
    const metaKeyIsPressed: boolean = currentPlatformIsMac ? event.metaKey : event.ctrlKey;

    /*
     * If both keys (meta and p) are pressed, print the diagram.
     * A diagram is printed, by throwing a printDiagram event.
     *
     * @see environment.events.diagramDetail.printDiagram
     */
    const pKeyIsPressed: boolean = event.key === 'p';
    const userWantsToPrint: boolean = metaKeyIsPressed && pKeyIsPressed;

    if (userWantsToPrint) {
      // Prevent the browser from handling the default action for CMD/CTRL + p.
      event.preventDefault();
      /**
       * We don't want the user to print an invalid diagram.
       */
      if (this.diagramIsInvalid) {
        this._notificationService.showNotification(NotificationType.WARNING,
          `The Diagram is invalid. Please resolve this issues to print the diagram`);

        return;
      }

      // TODO: Handle the promise properly
      this.getSVG().then((svg: string): void => {
        this._diagramPrintService.printDiagram(svg);
      });
    }
  }

  /**
   * Checks, if the current platform is a macOS.
   *
   * @returns true, if the current platform is macOS
   */
  private _checkIfCurrentPlatformIsMac = (): boolean => {
    const macRegex: RegExp = /.*mac*./i;
    const currentPlatform: string = navigator.platform;
    const currentPlatformIsMac: boolean = macRegex.test(currentPlatform);

    return currentPlatformIsMac;
  }

  private async getSVG(): Promise<string> {
    const returnPromise: Promise<string> = new Promise((resolve: Function, reject: Function): void => {
      this.modeler.saveSVG({}, (error: Error, result: string) => {
        if (error) {
          reject(error);
        }

        resolve(result);
      });
    });

    return returnPromise;
  }
}
