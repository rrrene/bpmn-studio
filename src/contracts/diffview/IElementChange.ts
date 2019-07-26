import { IModdleElement, IShape } from '@process-engine/bpmn-elements_contracts';

export interface IElementChange {
  $type: string;
  model: IShape;
  attrs: IModdleElement;
  name?: string;
}
