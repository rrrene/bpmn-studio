import {IBpmnModeler} from './IBpmnModeler';
import {IDependencyHook} from './IDependencyHook';

export interface IBpmnModelerConstructor {
  new (options: {additionalModules?: Array<IDependencyHook>; container?: string}): IBpmnModeler;
}
