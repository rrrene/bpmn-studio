import {IModdleElement} from '@process-engine/bpmn-elements_contracts';

export interface IDefinition {
  $type: string;
  diagrams: Array<IModdleElement>;
  id: string;
  rootElements: Array<IModdleElement>;
  get(element: string): Array<IModdleElement>;
}
