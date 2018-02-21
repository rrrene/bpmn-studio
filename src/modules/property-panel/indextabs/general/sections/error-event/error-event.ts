import {IBpmnModdle,
        IBpmnModeler,
        IDefinition,
        IElementRegistry,
        IError,
        IErrorElement,
        IModdleElement,
        IPageModel,
        ISection,
        IShape} from '../../../../../../contracts';

import {inject} from 'aurelia-framework';
import {GeneralService} from '../../service/general.service';

@inject(GeneralService)
export class ErrorEventSection implements ISection {

  public path: string = '/sections/error-event/error-event';
  public canHandleElement: boolean = false;

  private businessObjInPanel: IErrorElement;
  private moddle: IBpmnModdle;
  private modeler: IBpmnModeler;
  private generalService: GeneralService;

  public errors: Array<IError>;
  public selectedId: string;
  public selectedError: IError;
  public isEndEvent: boolean = false;

  private errorMessageVariable: string;

  constructor(generalService?: GeneralService) {
    this.generalService = generalService;
  }

  public async activate(model: IPageModel): Promise<void> {
    this.businessObjInPanel = model.elementInPanel.businessObject;

    this.moddle = model.modeler.get('moddle');
    this.modeler = model.modeler;
    this.errors = await this.getErrors();

    this.init();
  }

  public isSuitableForElement(element: IShape): boolean {
    if (this.elementIsErrorEvent(element)) {
      this.isEndEvent = this.elementIsEndEvent(element);
      return true;
    }
    return false;
  }

  private elementIsErrorEvent(element: IShape): boolean {
    return element !== undefined
        && element.businessObject !== undefined
        && element.businessObject.eventDefinitions !== undefined
        && element.businessObject.eventDefinitions[0].$type === 'bpmn:ErrorEventDefinition';
  }

  private elementIsEndEvent(element: IShape): boolean {
    return element !== undefined
        && element.businessObject !== undefined
        && element.businessObject.$type === 'bpmn:EndEvent';
  }

  private init(): void {
    if (this.businessObjInPanel.eventDefinitions
      && this.businessObjInPanel.eventDefinitions[0].$type === 'bpmn:ErrorEventDefinition') {
        const errorElement: IErrorElement = this.businessObjInPanel.eventDefinitions[0];
        if (errorElement.errorRef) {
          this.selectedId = errorElement.errorRef.id;
          this.updateError();
        } else {
          this.selectedError = null;
          this.selectedId = null;
        }
      }
  }

  private getXML(): string {
    let xml: string;
    this.modeler.saveXML({format: true}, (err: Error, diagrammXML: string) => {
      xml = diagrammXML;
    });
    return xml;
  }

  private getErrors(): Promise<Array<IError>> {
    return new Promise((resolve: Function, reject: Function): void => {

      this.moddle.fromXML(this.getXML(), (err: Error, definitions: IDefinition) => {
        const rootElements: Array<IModdleElement> = definitions.get('rootElements');
        const errors: Array<IErrorElement> = rootElements.filter((element: IModdleElement) => {
          return element.$type === 'bpmn:Error';
        });

        resolve(errors);
      });
    });
  }

  private updateError(): void {
    if (this.selectedId) {
      this.selectedError = this.errors.find((error: IError) => {
        return error.id === this.selectedId;
      });

      const errorElement: IErrorElement = this.businessObjInPanel.eventDefinitions[0];

      errorElement.errorRef = this.selectedError;
      if (!this.isEndEvent) {
        this.errorMessageVariable = errorElement.errorMessageVariable;
      }
    } else {
      this.selectedError = null;
    }
  }

  private updateErrorName(): void {
    this.moddle.fromXML(this.getXML(), async(err: Error, definitions: IDefinition) => {

      const rootElements: Array<IModdleElement> = definitions.get('rootElements');
      const error: IError = rootElements.find((element: IModdleElement) => {
        return element.$type === 'bpmn:Error' && element.id === this.selectedId;
      });

      error.name = this.selectedError.name;

      await this.updateXML(definitions);
    });
  }

  private updateErrorCode(): void {
    this.moddle.fromXML(this.getXML(), async(fromXMLError: Error, definitions: IDefinition) => {
      const rootElements: Array<IModdleElement> = definitions.get('rootElements');
      const error: IError = rootElements.find((element: any) => {
        return element.$type === 'bpmn:Error' && element.id === this.selectedId;
      });

      error.errorCode = this.selectedError.errorCode;

      await this.updateXML(definitions);
    });
  }

  private updateErrorMessage(): void {
    const errorElement: IErrorElement = this.businessObjInPanel.eventDefinitions[0];
    errorElement.errorMessageVariable = this.errorMessageVariable;
  }

  private async addError(): Promise<void> {
    this.moddle.fromXML(this.getXML(), async(err: Error, definitions: IDefinition) => {

      const bpmnError: IError = this.moddle.create('bpmn:Error',
        { id: `Error_${this.generalService.generateRandomId()}`, name: 'Error Name' });

      definitions.get('rootElements').push(bpmnError);

      this.moddle.toXML(definitions, (error: Error, xmlStrUpdated: string) => {
        this.modeler.importXML(xmlStrUpdated, async(errr: Error) => {
          await this.refreshErrors();
          await this.setBusinessObj();
          this.selectedId = bpmnError.id;
          this.selectedError = bpmnError;
          this.updateError();
        });
      });
    });
  }

  private async refreshErrors(): Promise<void> {
    this.errors = await this.getErrors();
  }

  private setBusinessObj(): Promise<void> {
    return new Promise((resolve: Function, reject: Function): void => {
      const elementRegistry: IElementRegistry = this.modeler.get('elementRegistry');
      const elementInPanel: IShape = elementRegistry.get(this.businessObjInPanel.id);
      this.businessObjInPanel = elementInPanel.businessObject;

      resolve();
    });
  }

  private updateXML(definitions: IDefinition): Promise<void> {
    return new Promise((resolve: Function, reject: Function): void => {

      this.moddle.toXML(definitions, (toXMLError: Error, xmlStrUpdated: string) => {
        this.modeler.importXML(xmlStrUpdated, async(errr: Error) => {
          await this.refreshErrors();
          await this.setBusinessObj();
        });
      });

      resolve();
    });
  }

  private clearName(): void {
    this.selectedError.name = '';
  }

  private clearCode(): void {
    this.selectedError.errorCode = '';
  }

  private clearMessage(): void {
    this.errorMessageVariable = '';
  }
}
