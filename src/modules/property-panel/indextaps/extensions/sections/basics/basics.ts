import {IBpmnModdle,
  IBpmnModeler,
  IEvent,
  IEventBus,
  IModdleElement,
  IPageModel,
  ISection,
  IShape} from '../../../../../../contracts';

export class BasicsSection implements ISection {

  public path: string = '/sections/basics/basics';
  public canHandleElement: boolean = false;

  private businessObjInPanel: IModdleElement;
  private eventBus: IEventBus;
  private moddle: IBpmnModdle;
  private modeler: IBpmnModeler;

  private properties: Array<any> = [];
  private selectedElement: IModdleElement;
  private newNames: Array<string> = [];
  private newValues: Array<string> = [];
  private propertyElement: IModdleElement;

  public async activate(model: IPageModel): Promise<void> {
    this.eventBus = model.modeler.get('eventBus');
    this.moddle = model.modeler.get('moddle');
    this.modeler = model.modeler;

    const selectedEvents: Array<IShape> = this.modeler.get('selection')._selectedElements;
    if (selectedEvents[0]) {
      this.businessObjInPanel = selectedEvents[0].businessObject;
      this.init();
    }

    this.eventBus.on('element.click', (event: IEvent) => {
      this.businessObjInPanel = event.element.businessObject;
      this.init();
    });
  }

  private init(): void {
    this.propertyElement = this.getPropertyElement();
    this.selectedElement = this.businessObjInPanel;
    this.reloadProperties();
  }

  private async addProperty(): Promise<void> {
    const bpmnProperty: IModdleElement = this.moddle.create('camunda:Property',
                                                        { name: '',
                                                          value: '',
                                                        });

    this.newNames.push('');
    this.newValues.push('');

    this.propertyElement.values.push(bpmnProperty);
    this.properties.push(bpmnProperty);
  }

  private removeProperty(index: number): void {
    this.propertyElement.values.splice(index, 1);
    this.reloadProperties();
  }

  private reloadProperties(): void {
    this.properties = [];
    this.newNames = [];
    this.newValues = [];

    if (!this.propertyElement || !this.propertyElement.values) {
      return;
    }

    const properties: Array<IModdleElement> = this.propertyElement.values;
    for (const property of properties) {
      if (property.$type === `camunda:Property`) {
        this.newNames.push(property.name);
        this.newValues.push(property.value);
        this.properties.push(property);
      }
    }
  }

  private getPropertyElement(): IModdleElement {
    let propertyElement: IModdleElement;

    if (!this.businessObjInPanel.extensionElements) {
      this.createExtensionElement();
    }

    for (const extensionValue of this.businessObjInPanel.extensionElements.values) {
      if (extensionValue.$type === 'camunda:Properties') {
        propertyElement = extensionValue;
      }
    }

    if (!propertyElement) {
      const propertyValues: Array<IModdleElement> = [];

      const extensionPropertyElement: IModdleElement = this.moddle.create('camunda:Properties', {values: propertyValues});
      this.businessObjInPanel.extensionElements.values.push(extensionPropertyElement);

      return this.getPropertyElement();
    }

    return propertyElement;
  }

  private createExtensionElement(): void {
    const bpmnExecutionListener: IModdleElement = this.moddle.create('camunda:ExecutionListener',
                                                                { class: '',
                                                                  event: '',
                                                                });

    const extensionValues: Array<IModdleElement> = [];
    const propertyValues: Array<IModdleElement> = [];
    const properties: IModdleElement = this.moddle.create('camunda:Properties', {values: propertyValues});
    extensionValues.push(bpmnExecutionListener);
    extensionValues.push(properties);

    const extensionElements: IModdleElement = this.moddle.create('bpmn:ExtensionElements', {values: extensionValues});
    this.businessObjInPanel.extensionElements = extensionElements;
  }

  private changeName(index: number): void {
    this.propertyElement.values[index].name = this.newNames[index];
  }

  private changeValue(index: number): void {
    this.propertyElement.values[index].value = this.newValues[index];
  }

  public checkElement(element: IModdleElement): boolean {
    return true;
  }

}
