import {IModdleElement} from '@process-engine/bpmn-elements_contracts';

export interface IDescriptor {
  businessObject: IModdleElement;
  height: number;
  oldBusinessObject: IModdleElement;
  type: string;
  width: number;
  x: number;
  y: number;
}
