import {IShape} from '@process-engine/bpmn-elements_contracts';

export interface IDiagramState {
  data: {
    xml: string,
  };
  metaData: {
    location: any,
    selectedElements: Array<IShape>,
  };
}
