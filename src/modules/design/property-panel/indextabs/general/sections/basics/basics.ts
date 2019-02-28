import {EventAggregator} from 'aurelia-event-aggregator';
import {inject} from 'aurelia-framework';
import {ValidateEvent, ValidationController, ValidationRules} from 'aurelia-validation';

import {IModdleElement, IShape} from '@process-engine/bpmn-elements_contracts';

import {
  IBpmnModdle,
  IBpmnModeler,
  IElementRegistry,
  IModeling,
  IPageModel,
  ISection,
} from '../../../../../../../contracts';
import environment from '../../../../../../../environment';

@inject(ValidationController, EventAggregator)
export class BasicsSection implements ISection {

  public path: string = '/sections/basics/basics';
  public canHandleElement: boolean = true;
  public businessObjInPanel: IModdleElement;
  public elementDocumentation: string;
  public validationError: boolean = false;

  private _modeling: IModeling;
  private _modeler: IBpmnModeler;
  private _bpmnModdle: IBpmnModdle;
  private _elementInPanel: IShape;
  private _previousProcessRefId: string;
  private _validationController: ValidationController;
  private _eventAggregator: EventAggregator;

  constructor(controller?: ValidationController, eventAggregator?: EventAggregator) {
    this._validationController = controller;
    this._eventAggregator = eventAggregator;
  }

  public activate(model: IPageModel): void {
    if (this.validationError) {
      this.businessObjInPanel.id = this._previousProcessRefId;
      this._validationController.validate();
    }

    this._elementInPanel = model.elementInPanel;
    this.businessObjInPanel = model.elementInPanel.businessObject;
    this._previousProcessRefId = model.elementInPanel.businessObject.id;

    this._modeling = model.modeler.get('modeling');
    this._bpmnModdle = model.modeler.get('moddle');
    this._modeler = model.modeler;

    this._validationController.subscribe((event: ValidateEvent) => {
      this._validateFormId(event);
    });

    this._init();

    this._setValidationRules();
  }

  public detached(): void {
    if (!this.validationError) {
      return;
    }
    this.businessObjInPanel.id = this._previousProcessRefId;
    this._validationController.validate();
  }

  public isSuitableForElement(element: IShape): boolean {
    if (element === undefined || element === null) {
      return false;
    }

    return true;
  }

  public updateDocumentation(): void {
    this._elementInPanel.documentation = [];

    const documentationPropertyObject: Object = {text: this.elementDocumentation};
    const documentation: IModdleElement = this._bpmnModdle.create('bpmn:Documentation', documentationPropertyObject);
    this._elementInPanel.documentation.push(documentation);

    const elementInPanelDocumentation: Object = {documentation: this._elementInPanel.documentation};
    this._modeling.updateProperties(this._elementInPanel, elementInPanelDocumentation);
    this._publishDiagramChange();
  }

  public updateName(): void {
    this._modeling.updateLabel(this._elementInPanel, this.businessObjInPanel.name);

    this._publishDiagramChange();
  }

  public updateId(): void {
    this._validationController.validate();

    if (this._validationController.errors.length > 0) {
      return;
    }

    const updateProperty: Object = {id: this.businessObjInPanel.id};
    this._modeling.updateProperties(this._elementInPanel, updateProperty);
    this._publishDiagramChange();
  }

  private _init(): void {
    if (!this.businessObjInPanel) {
      return;
    }

    const documentationExists: boolean = this.businessObjInPanel.documentation !== undefined
                                      && this.businessObjInPanel.documentation !== null
                                      && this.businessObjInPanel.documentation.length > 0;

    if (documentationExists) {
      this.elementDocumentation = this.businessObjInPanel.documentation[0].text;
    } else {
      this.elementDocumentation = '';
    }
  }

  private _validateFormId(event: ValidateEvent): void {
    if (event.type !== 'validate') {
      return;
    }

    this.validationError = false;
    for (const result of event.results) {
      if (result.rule.property.displayName !== 'elementId') {
        continue;
      }
      if (result.valid === false) {
        this.validationError = true;
        document.getElementById(result.rule.property.displayName).style.border = '2px solid red';
      } else {
        document.getElementById(result.rule.property.displayName).style.border = '';
      }
    }
  }

  private _formIdIsUnique(id: string): boolean {
    const elementRegistry: IElementRegistry = this._modeler.get('elementRegistry');

    const elementsWithSameId: Array<IShape> = elementRegistry.filter((element: IShape) => {
      const elementIsBusinessObjectInPanel: boolean = element.businessObject === this.businessObjInPanel;
      if (elementIsBusinessObjectInPanel) {
        return false;
      }

      const elementIsOfTypeLabel: boolean = element.type === 'label';
      if (elementIsOfTypeLabel) {
        return false;
      }

      const elementHasSameId: boolean = element.businessObject.id === this.businessObjInPanel.id;

      return elementHasSameId;
    });

    return elementsWithSameId.length === 0;
  }

  private _isProcessIdUnique(id: string): boolean {
    const elementIds: Array<string> = this._modeler._definitions.rootElements.map((rootElement: IModdleElement) => {
      return rootElement.id;
    });

    const currentId: number = elementIds.indexOf(id);
    elementIds.splice(currentId, 1);

    return !elementIds.includes(id);
  }

  private _setValidationRules(): void {
    ValidationRules
      .ensure((businessObject: IModdleElement) => businessObject.id)
      .displayName('elementId')
      .required()
        .withMessage('ID cannot be blank.')
      .then()
      .satisfies((id: string) => this._formIdIsUnique(id) && this._isProcessIdUnique(id))
        .withMessage('ID already exists.')
      .on(this.businessObjInPanel);
  }

  private _publishDiagramChange(): void {
    this._eventAggregator.publish(environment.events.diagramChange);
  }
}
