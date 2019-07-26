import { IXmlConvertService } from '../../../../contracts/index';
import { IExportService } from '../../../../contracts/index';
import { ExportService } from './export.service';

export class DiagramXmlConverter implements IXmlConvertService {
  private _xmlContent: string;
  private _enqueuedPromises: Array<Promise<string>> = [];

  constructor(xmlContent: string) {
    this._xmlContent = xmlContent;
  }

  public asBpmn(): IExportService {
    const formatterPromise: Promise<string> = this._bpmnExporter();
    const mimeType: string = 'application/bpmn20-xml';

    this._enqueuedPromises.push(formatterPromise);

    return new ExportService(mimeType, this._enqueuedPromises);
  }

  /**
   * Formats the current loaded xml.
   */
  private _bpmnExporter = async (): Promise<string> => {
    return Promise.resolve(this._xmlContent);
  };
}
