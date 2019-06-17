import {IShape} from '@process-engine/bpmn-elements_contracts';

import {IDiagramState} from '../../contracts';

export class OpenDiagramStateService {

  public saveDiagramState(uri: string, xml: string, location: any, selectedElements: Array<IShape>): void {
    const diagramState: IDiagramState = {
      data: {
        xml: xml,
      },
      metaData: {
        location: location,
        selectedElements: selectedElements,
      },
    };

    const key: string = this._getLocalStorageKeyByUri(uri);
    const value: string = JSON.stringify(diagramState);

    window.localStorage.setItem(key, value);
  }

  public loadDiagramState(uri: string): IDiagramState | null {
    const key: string = this._getLocalStorageKeyByUri(uri);

    const dataFromLocalStorage: string = window.localStorage.getItem(key);

    const noDataFound: boolean = dataFromLocalStorage === null;
    if (noDataFound) {
      return null;
    }

    const diagramState: IDiagramState = JSON.parse(dataFromLocalStorage);

    return diagramState;
  }

  public deleteDiagramState(uri: string): void {
    const key: string = this._getLocalStorageKeyByUri(uri);

    window.localStorage.removeItem(key);
  }

  private _getLocalStorageKeyByUri(uri: string): string {
    return `Open Diagram: ${uri}`;
  }
}
