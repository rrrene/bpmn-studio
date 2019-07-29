import {IExportService} from '../../../../contracts/index';
import {DiagramExportRepository} from '../repositories/DiagramExportRepository';

export class ExportService implements IExportService {
  private _enqueuedPromises: Array<Promise<string>>;
  private _exportDiagramRepository: DiagramExportRepository;
  private _currentMimeType: string;

  constructor(currentMimeType: string, enqueuedPromises: Array<Promise<string>>) {
    this._currentMimeType = currentMimeType;
    this._enqueuedPromises = enqueuedPromises;
    this._exportDiagramRepository = new DiagramExportRepository();
  }

  public async export(filename: string): Promise<void> {
    /*
     * Wait, until all queued functions are executed
     */
    const contentToExport: string = await this._enqueuedPromises.reduce(
      (lastPromise: Promise<string>, currentPromise: Promise<string>): Promise<string> => {
        return lastPromise.then((result: string) => {
          return currentPromise;
        });
      },
    );

    /*
     * If all exporters are finished, save the diagram to disk using the
     * defined export repository.
     */
    this._exportDiagramRepository.exportDiagram(contentToExport, filename, this._currentMimeType);

    /*
     * After exporting, we can reset the queued promises.
     */
    this._enqueuedPromises = [];
  }
}
