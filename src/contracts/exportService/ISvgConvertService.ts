import {IExportService} from './index';

export interface ISvgConvertService {
  asPNG(): IExportService;
  asJPEG(): IExportService;
  asSVG(): IExportService;
}
