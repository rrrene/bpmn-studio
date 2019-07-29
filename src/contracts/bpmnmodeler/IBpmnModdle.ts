import {IModdleElement} from '@process-engine/bpmn-elements_contracts';

import {IDefinition, IIds} from './index';

export interface IBpmnModdle {
  ids: IIds;
  fromXML(xml: string, callback: (err: Error, definitions: IDefinition) => void): void;
  create(name: string, attributes: object): IModdleElement;
  toXML(definitions: IDefinition, callback: (err: Error, xmlStrUpdated: string) => void): void;
}
