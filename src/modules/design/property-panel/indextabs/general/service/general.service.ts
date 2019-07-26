import { inject } from 'aurelia-framework';

import { IDiagram } from '@process-engine/solutionexplorer.contracts';

import { GeneralRepository } from '../repository/general.repository';

@inject(GeneralRepository)
export class GeneralService {
  private _generalRepository: GeneralRepository;

  constructor(generalRepository: GeneralRepository) {
    this._generalRepository = generalRepository;
  }

  public generateRandomId(): string {
    let randomId: string = '';
    const possible: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    const randomIdLength: number = 8;
    for (let i: number = 0; i < randomIdLength; i++) {
      randomId += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return randomId;
  }

  public getAllDiagrams(): Promise<Array<IDiagram>> {
    return this._generalRepository.getAllDiagrams();
  }
}
