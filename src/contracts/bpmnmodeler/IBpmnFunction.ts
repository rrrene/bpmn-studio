import {IShape} from '@process-engine/bpmn-elements_contracts';

export interface IBpmnFunction {
  trigger(selection: Array<IShape>, option: string): void;
}
