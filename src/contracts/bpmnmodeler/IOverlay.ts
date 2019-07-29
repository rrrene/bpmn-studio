import {IShape} from '@process-engine/bpmn-elements_contracts';

import {IOverlayPosition} from './IOverlayPosition';

export interface IOverlay {
  element: IShape;
  html: string;
  htmlContainer: HTMLElement;
  id: string;
  position: IOverlayPosition;
  scale: boolean;
  show: boolean;
  type: string;
}
