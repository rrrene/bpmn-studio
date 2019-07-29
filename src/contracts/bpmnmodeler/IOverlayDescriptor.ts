import {IOverlayPosition} from './IOverlayPosition';

export interface IOverlayDescriptor {
  position: IOverlayPosition;
  html: string;
  // Configure scale=false to use non-scaling overlays
  // Configure scale={ min: 1 } to use non-shrinking overlays
  scale?: false | {min: 1};
  // Configure show={ minZoom: 0.6 } to hide overlays at low zoom levels
  show?: {minZoom: number};
}
