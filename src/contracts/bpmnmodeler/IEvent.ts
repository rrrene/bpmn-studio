import {IShape} from '@process-engine/bpmn-elements_contracts';

export interface IEvent {
  type: string;
  element: IShape;
  newSelection?: Array<IShape>;
  oldSelection?: Array<IShape>;
}
