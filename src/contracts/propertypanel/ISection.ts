import {IShape} from '@process-engine/bpmn-elements_contracts';

import {IPageModel} from '../index';

export interface ISection {
  path: string;
  canHandleElement: boolean;
  activate(model: IPageModel): void;
  isSuitableForElement(element: IShape): boolean;
}
