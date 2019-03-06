import {EventAggregator} from 'aurelia-event-aggregator';
import {inject} from 'aurelia-framework';

import {IMessage, IMessageTask, IModdleElement, IShape} from '@process-engine/bpmn-elements_contracts';

import {
  IBpmnModdle,
  IBpmnModeler,
  IElementRegistry,
  ILinting,
  IPageModel,
  ISection,
} from '../../../../../../../contracts';
import environment from '../../../../../../../environment';
import {GeneralService} from '../../service/general.service';

@inject(GeneralService, EventAggregator)
export class MessageTaskSection implements ISection {

  public path: string = '/sections/message-task/message-task';
  public canHandleElement: boolean = false;
  public messages: Array<IMessage>;
  public selectedId: string;
  public selectedMessage: IMessage;

  private _businessObjInPanel: IMessageTask;
  private _linter: ILinting;
  private _moddle: IBpmnModdle;
  private _modeler: IBpmnModeler;
  private _generalService: GeneralService;
  private _eventAggregator: EventAggregator;

  constructor(generalService?: GeneralService, eventAggregator?: EventAggregator) {
    this._generalService = generalService;
    this._eventAggregator = eventAggregator;
  }

  public async activate(model: IPageModel): Promise<void> {
    this._businessObjInPanel = model.elementInPanel.businessObject;

    this._moddle = model.modeler.get('moddle');
    this._modeler = model.modeler;
    this._linter = model.modeler.get('linting');

    this.messages = await this._getMessages();

    this._init();
  }

  public isSuitableForElement(element: IShape): boolean {
    return this._elementIsMessageTask(element);
  }

  public updateMessage(): void {
    this.selectedMessage = this.messages.find((message: IMessage) => {
      return message.id === this.selectedId;
    });

    this._businessObjInPanel.messageRef = this.selectedMessage;
    this._publishDiagramChange();

    this._linter.update();
  }

  public updateName(): void {
    const rootElements: Array<IModdleElement> = this._modeler._definitions.rootElements;
    const selectedMessage: IMessage = rootElements.find((element: IModdleElement) => {
      const elementIsSelectedMessage: boolean = element.$type === 'bpmn:Message' && element.id === this.selectedId;

      return elementIsSelectedMessage;
    });

    selectedMessage.name = this.selectedMessage.name;
    this._publishDiagramChange();
  }

  public addMessage(): void {
    const bpmnMessageProperty: {id: string, name: string} = {
      id: `Message_${this._generalService.generateRandomId()}`,
      name: 'Message Name',
    };
    const bpmnMessage: IMessage = this._moddle.create('bpmn:Message', bpmnMessageProperty);

    this._modeler._definitions.rootElements.push(bpmnMessage);

    this._moddle.toXML(this._modeler._definitions.rootElements, (toXMLError: Error, xmlStrUpdated: string) => {
      this._modeler.importXML(xmlStrUpdated, async(importXMLError: Error) => {
        await this._refreshMessages();
        await this._setBusinessObj();

        this.selectedId = bpmnMessage.id;
        this.updateMessage();
      });
    });

    this._publishDiagramChange();
  }

  public removeSelectedMessage(): void {
    const noMessageIsSelected: boolean = !this.selectedId;
    if (noMessageIsSelected) {
      return;
    }

    const messageIndex: number = this.messages.findIndex((message: IMessage) => {
      return message.id === this.selectedId;
    });

    this.messages.splice(messageIndex, 1);
    this._modeler._definitions.rootElements.splice(this._getRootElementsIndex(this.selectedId), 1);

    this.updateMessage();
    this._publishDiagramChange();
  }

  private _getRootElementsIndex(elementId: string): number {
    const rootElements: Array<IModdleElement> = this._modeler._definitions.rootElements;

    const rootElementsIndex: number = rootElements.findIndex((element: IModdleElement) => {
      return element.id === elementId;
    });

    return rootElementsIndex;
  }

  private _elementIsMessageTask(element: IShape): boolean {
    return element !== undefined
        && (element.type === 'bpmn:SendTask'
          || element.type === 'bpmn:ReceiveTask');
  }

  private _init(): void {
    const businessObjectHasNoMessageEvents: boolean = this._businessObjInPanel === undefined
                                                   || this._businessObjInPanel.messageRef === undefined;
    if (businessObjectHasNoMessageEvents) {
      this.selectedMessage = undefined;
      this.selectedId = undefined;

      return;
    }

    const messageRef: IMessage = this._businessObjInPanel.messageRef;
    const messageId: string = messageRef.id;
    const elementReferencesMessage: boolean = this._getMessageById(messageId) !== undefined;

    if (elementReferencesMessage) {
      this.selectedId = messageId;
      this.updateMessage();
    } else {
      this.selectedMessage = undefined;
      this.selectedId = undefined;
    }
  }

  private _getMessageById(messageId: string): IMessage {
    const messages: Array<IMessage> = this._getMessages();
    const message: IMessage = messages.find((messageElement: IMessage) => {
      return messageElement.id === messageId;
    });

    return message;
  }

  private _getMessages(): Array<IMessage> {
    const rootElements: Array<IModdleElement> = this._modeler._definitions.rootElements;
    const messages: Array<IMessage> = rootElements.filter((element: IModdleElement) => {
      return element.$type === 'bpmn:Message';
    });

    return messages;
  }

  private async _refreshMessages(): Promise<void> {
    this.messages = await this._getMessages();
  }

  private _setBusinessObj(): void {
    const elementRegistry: IElementRegistry = this._modeler.get('elementRegistry');
    const elementInPanel: IShape = elementRegistry.get(this._businessObjInPanel.id);

    this._businessObjInPanel = elementInPanel.businessObject;
  }

  private _publishDiagramChange(): void {
    this._eventAggregator.publish(environment.events.diagramChange);
  }
}
