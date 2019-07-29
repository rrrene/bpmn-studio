import {ISvgConvertService, IXmlConvertService} from './index';

export interface IDiagramExportService {
  loadXML(xml: string): IXmlConvertService;
  loadSVG(svg: string): ISvgConvertService;
}
