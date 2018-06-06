import {
  IBpmnModdle,
  IBpmnModeler,
  IElementRegistry,
  IExtensionElement,
  IForm,
  IFormElement,
  IModdleElement,
  IPageModel,
  IProperty,
  IPropertyElement,
  ISection,
  IShape,
} from '../../../../../../contracts';

import {inject} from 'aurelia-framework';
import {ValidateEvent, ValidationController, ValidationRules} from 'aurelia-validation';

@inject(ValidationController)
export class BasicsSection implements ISection {

  public path: string = '/sections/basics/basics';
  public canHandleElement: boolean = true;
  public validationError: boolean = false;
  public validationController: ValidationController;
  public isFormSelected: boolean = false;
  public businessObjInPanel: IFormElement;
  public forms: Array<IForm>;
  public selectedForm: IForm;
  public selectedType: string;
  public types: Array<string> = ['string', 'long', 'boolean', 'date', 'enum', 'custom type'];
  public customType: string;
  public formfieldValues: Array<IProperty> = [];
  public newFormfieldValueIds: Array<string> = [];
  public newFormfieldValueNames: Array<string> = [];

  private _bpmnModdle: IBpmnModdle;
  private _modeler: IBpmnModeler;
  private _selectedIndex: number;
  private _formElement: IFormElement;
  private _previousFormId: string;
  private _previousForm: IForm;
  private _activeListElementId: string;

  constructor(controller?: ValidationController) {
    this.validationController = controller;
  }

  public activate(model: IPageModel): void {
    this.businessObjInPanel = model.elementInPanel.businessObject;

    this._modeler = model.modeler;
    this._bpmnModdle = this._modeler.get('moddle');

    this.validationController.subscribe((event: ValidateEvent) => {
      this._validateFormId(event);
    });

    this._init();

    if (this.validationError) {
      this._previousForm.id = this._previousFormId;
      this.validationController.validate();
    }
  }

  public detached(): void {
    this._validateOnDetach();
  }

  public isSuitableForElement(element: IShape): boolean {

    const elementHasNoBusinessObject: boolean = element.businessObject === undefined
                                             || element.businessObject === null;

    if (elementHasNoBusinessObject) {
      return false;
    }

    return element.businessObject.$type === 'bpmn:UserTask';
  }

  public addFormfieldValue(): void {
    const formfieldValue: Object = {
      id: `Value_${this._generateRandomId()}`,
      value: '',
    };
    const bpmnValue: IProperty = this._bpmnModdle.create('camunda:Value', formfieldValue);

    this.formfieldValues.push(bpmnValue);
    Object.assign(this._formElement.fields[this._selectedIndex].values, this.formfieldValues);
    this._reloadFormfieldValues();
  }

  public removeFormfieldValue(index: number): void {
    this._formElement.fields[this._selectedIndex].values.splice(index, 1);
    this._reloadFormfieldValues();
  }

  public changeFormfieldValueId(index: number): void {
    this.formfieldValues[index].id = this.newFormfieldValueIds[index];
    Object.assign(this._formElement.fields[this._selectedIndex].values, this.formfieldValues);
  }

  public changeFormfieldValueName(index: number): void {
    this.formfieldValues[index].name = this.newFormfieldValueNames[index];
    Object.assign(this._formElement.fields[this._selectedIndex].values, this.formfieldValues);
  }

  public removeSelectedForm(): void {
    const noFormFieldSelected: boolean = !this.isFormSelected;
    if (noFormFieldSelected) {
      return;
    }

    this._formElement.fields.splice(this._selectedIndex, 1);

    this.isFormSelected = false;
    this.selectedForm = undefined;
    this._selectedIndex = undefined;

    this._reloadForms();
  }

  public async addForm(): Promise<void> {

    const bpmnFormObject: IForm =  {
      id: `Form_${this._generateRandomId()}`,
      type: null,
      label: '',
      defaultValue: '',
    };
    const bpmnForm: IForm = this._bpmnModdle.create('camunda:FormField', bpmnFormObject);

    if (this._formElement.fields === undefined || this._formElement.fields === null) {
      this._formElement.fields = [];
    }

    this._formElement.fields.push(bpmnForm);
    this.forms.push(bpmnForm);
    this.selectedForm = bpmnForm;

    this.selectForm();
  }

  public updateId(): void {
    this.validationController.validate();

    const hasValidationErrors: boolean = this.validationController.errors.length > 0;
    if (hasValidationErrors) {
      this._resetId();
    }

    const isSelectedFormIdNotExisting: boolean = this.selectedForm === null || this.selectedForm.id === '';
    if (isSelectedFormIdNotExisting) {
      return;
    }

    this._formElement.fields[this._selectedIndex].id = this.selectedForm.id;
  }

  public selectForm(): void {
    if (this.validationError) {
      this._previousForm.id = this._previousFormId;
    }

    this._previousFormId = this.selectedForm.id;
    this._previousForm = this.selectedForm;

    this.validationController.validate();

    this.isFormSelected = true;
    this.selectedType = this._getTypeAndHandleCustomType(this.selectedForm.type);
    this._selectedIndex = this._getSelectedIndex();

    this._setValidationRules();
    this._reloadFormfieldValues();
  }

  public updateType(): void {
    let type: string;

    if (this.selectedType === 'custom type') {
      type = this.customType;
    } else {
      type = this.selectedType;
    }

    this._formElement.fields[this._selectedIndex].type = type;
    this._reloadFormfieldValues();
  }

  public updateLabel(): void {
    this._formElement.fields[this._selectedIndex].label = this.selectedForm.label;
  }

  public updateDefaultValue(): void {
    this._formElement.fields[this._selectedIndex].defaultValue = this.selectedForm.defaultValue;
  }

  private _validateOnDetach(): void {
    if (!this.validationError) {
      return;
    }

    const bpmnFormFieldObject: IForm = {
      id: `Form_${this._generateRandomId()}`,
      type: null,
      label: '',
      defaultValue: '',
    };
    const bpmnForm: IForm = this._bpmnModdle.create('camunda:FormField', bpmnFormFieldObject);

    if (this._formElement.fields === undefined || this._formElement.fields === null) {
      this._formElement.fields = [];
    }

    this._resetIdOnSelectedOrPrevious();

    this.validationController.validate();
    this.updateId();
  }

  private _resetIdOnSelectedOrPrevious(): void {
    if (this.selectedForm !== null) {
      this.selectedForm.id = this._previousFormId;
    } else {
      this._previousForm.id = this._previousFormId;
    }
  }

  private _init(): void {
    this.isFormSelected = false;
    if (this.canHandleElement) {
      this._formElement = this._getOrCreateFormElement();
      this._reloadForms();
    }
  }

  private _resetId(): void {
    this._resetIdOnSelectedOrPrevious();

    this.validationController.validate();
  }

  private _reloadFormfieldValues(): void {
    const formIsNotEnum: boolean = this.selectedForm.type !== 'enum';
    const noValuesInEnum: boolean = this.selectedForm.values === undefined
                                && this.selectedForm.values.length === 0;

    if (formIsNotEnum) {
      return;
    }

    if (noValuesInEnum) {
      this
        ._formElement
        .fields[this._selectedIndex]
        .values = [];
    }

    /*
     * Prepare new form fields.
     */
    const formfieldValues: Array<IProperty> = [];
    const newFormfieldValueIds: Array<string> = [];
    const newFormfieldValueNames: Array<string> = [];

    for (const value of this.selectedForm.values) {
      const camundaValue: boolean = value.$type !== 'camunda:Value';
      if (camundaValue) {
        continue;
      }

      formfieldValues.push(value);
      newFormfieldValueIds.push(value.id);
      newFormfieldValueNames.push(value.name);
    }

    /*
     * Assign new form fields values.
     */
    this.formfieldValues = formfieldValues;
    this.newFormfieldValueIds = newFormfieldValueIds;
    this.newFormfieldValueNames = newFormfieldValueNames;
  }

  private _reloadForms(): void {
    this.forms = [];

    const noFormFieldsExist: boolean = this._formElement === undefined
                                    || this._formElement === null
                                    || this._formElement.fields === undefined
                                    || this._formElement.fields === null
                                    || this._formElement.fields.length === 0;
    if (noFormFieldsExist) {
      return;
    }

    this.forms = this._formElement.fields.filter((form: IForm) => {
      const formIsFormField: boolean = form.$type === 'camunda:FormField';

      return formIsFormField;
    });
  }

  private _getTypeAndHandleCustomType(type: string): string {
    const typeIsRegularType: boolean = this.types.includes(type) || type === null;

    if (typeIsRegularType) {
      this.customType = '';
      return type;
    }

    this.customType = type;
    return 'custom type';
  }

  private _getSelectedIndex(): number {
    return this._formElement.fields.findIndex((form: IForm) => {
      const formIsSelectedForm: boolean = form.id === this.selectedForm.id;

      return formIsSelectedForm;
    });
  }

  private _getOrCreateFormElement(): IModdleElement {
    const elementHasNoExtensionsElement: boolean = this.businessObjInPanel.extensionElements === undefined
                                                || this.businessObjInPanel.extensionElements === null;

    if (elementHasNoExtensionsElement) {
      this._createExtensionElement();
    }

    const extensionsValues: Array<IModdleElement> = this.businessObjInPanel.extensionElements.values;

    const formElement: IModdleElement = extensionsValues.find((extensionValue: IModdleElement) => {
      const extensionIsValidForm: boolean = extensionValue.$type === 'camunda:FormData';

      return extensionIsValidForm;
    });

    if (formElement === undefined) {
      this._createEmptyFormData();
      return this._getOrCreateFormElement();
    }

    return formElement;
  }

  private _createExtensionElement(): void {
    const values: Array<IFormElement> = [];
    const fields: Array<IForm> = [];
    const formData: IFormElement = this._bpmnModdle.create('camunda:FormData', {fields: fields});
    values.push(formData);

    this.businessObjInPanel.formKey = 'Form Key';
    const extensionElements: IModdleElement = this._bpmnModdle.create('bpmn:ExtensionElements', {values: values});
    this.businessObjInPanel.extensionElements = extensionElements;
  }

  private _createEmptyFormData(): void {
    const fields: Array<IModdleElement> = [];
    const extensionFormElement: IModdleElement = this._bpmnModdle.create('camunda:FormData', {fields: fields});
    this.businessObjInPanel.extensionElements.values.push(extensionFormElement);
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

  private _deleteExtensions(): void {
    delete this.businessObjInPanel.extensionElements;
    delete this.businessObjInPanel.formKey;
  }

  private _validateFormId(event: ValidateEvent): void {
    if (event.type !== 'validate') {
      return;
    }

    this.validationError = false;
    for (const result of event.results) {
      if (result.rule.property.displayName !== 'formId') {
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

  private _hasFormSameIdAsSelected(forms: Array<IForm>): boolean {

    const unselectedFormWithSameId: IForm = forms.find((form: IForm) => {

      const formHasSameIdAsSelectedForm: boolean = form.id === this.selectedForm.id;
      const formIsNotSelectedForm: boolean = form !== this.selectedForm;

      return formHasSameIdAsSelectedForm && formIsNotSelectedForm;
    });

    return unselectedFormWithSameId !== undefined;
  }

  private _getFormDataFromBusinessObject(businessObject: IModdleElement): IFormElement {
    const extensionElement: IExtensionElement = businessObject.extensionElements;
    const hasNoExtensionElements: boolean = extensionElement === undefined;
    if (hasNoExtensionElements) {
      return;
    }

    const extensions: Array<IModdleElement> = extensionElement.values;
    return extensions.find((extension: IModdleElement) => {
      const isFormData: boolean = extension.$type === 'camunda:FormData';

      return isFormData;
    });
  }

  private _getFormsById(id: string): Array<IShape> {
    const elementRegistry: IElementRegistry = this._modeler.get('elementRegistry');

    const formsWithId: Array<IShape> = elementRegistry.filter((element: IShape) => {
      const currentBusinessObject: IModdleElement = element.businessObject;

      const isNoUserTask: boolean = currentBusinessObject.$type !== 'bpmn:UserTask';
      if (isNoUserTask) {
        return false;
      }
      const formData: IFormElement = this._getFormDataFromBusinessObject(currentBusinessObject);
      if (formData === undefined) {
        return false;
      }

      const forms: Array<IForm> = formData.fields;

      return this._hasFormSameIdAsSelected(forms);
    });

    return formsWithId;
  }

  private _formIdIsUnique(id: string): boolean {
    const formsWithSameId: Array<IShape> = this._getFormsById(id);
    const isIdUnique: boolean = formsWithSameId.length === 0;

    return isIdUnique;
  }

  private _setValidationRules(): void {
    ValidationRules
      .ensure((form: IForm) => form.id)
      .displayName('formId')
      .required()
      .withMessage('Id cannot be blank.')
      .then()
      .satisfies((id: string) => this._formIdIsUnique(id))
      .withMessage('Id already exists.')
      .on(this.selectedForm);
  }
}
