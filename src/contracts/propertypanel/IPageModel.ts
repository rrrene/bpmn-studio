import {IShape} from '@process-engine/bpmn-elements_contracts';

import {IBpmnModeler} from '../bpmnmodeler/IBpmnModeler';

export interface IPageModel {
  modeler: IBpmnModeler;
  elementInPanel: IShape;
  isEditable: boolean;
}
