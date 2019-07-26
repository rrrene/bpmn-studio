import { IShape } from '@process-engine/bpmn-elements_contracts';

import { IOverlay } from './IOverlay';
import { IOverlayDescriptor } from './IOverlayDescriptor';

export interface IOverlayManager {
  _overlays: Map<string, IOverlay>;

  add(elementOrElementId: string | IShape, overlayDescriptor: IOverlayDescriptor): void;
  remove(elementOrElementId: string | IShape): void;
  clear(): void;
}
