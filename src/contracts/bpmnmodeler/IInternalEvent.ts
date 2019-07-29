import {IShape} from '@process-engine/bpmn-elements_contracts';

import {IDescriptor} from './IDescriptor';

export interface IInternalEvent {
  cancelBubble?: boolean;
  createdElements?: object;
  descriptor?: IDescriptor;
  returnValue?: IInternalEvent;
  keyEvent?: KeyboardEvent;
  type: undefined;
  element?: IShape;
}
