import {IInnerViewbox} from './IInnerViewbox';
import {IOuterViewbox} from './IOuterViewbox';

export interface IViewbox {
  width: number;
  height: number;
  x: number;
  y: number;
  scale: number;
  inner: IInnerViewbox;
  outer: IOuterViewbox;
}
