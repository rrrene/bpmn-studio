import {IShape} from '@process-engine/bpmn-elements_contracts';

import {IViewbox} from './IViewbox';

export interface ICanvas {
  _container: HTMLElement;
  getRootElement(): IShape;

  /*
   *  Gets or sets the viewbox of the canvas.
   *
   * @param viewbox The new viewbox for the canvas.
   * @returns The current viewbox.
   */
  viewbox(viewbox?: IViewbox): IViewbox;

  zoom(zoomLevel: number | string, element?: IShape | string): void;
}
