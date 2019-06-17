import {IShape} from '@process-engine/bpmn-elements_contracts';
import {IViewbox} from '../index';

export interface IDiagramState {
  data: {
    xml: string,
  };
  metaData: {
    location: IViewbox,
    selectedElements: Array<IShape>,
  };
}
