import {inject} from 'aurelia-framework';

import {IIdentity} from '@essential-projects/iam_contracts';
import {DataModels} from '@process-engine/management_api_contracts';

import {ITokenViewerRepository, ITokenViewerService} from '../contracts';

@inject('TokenViewerRepository')
export class TokenViewerService implements ITokenViewerService {

  private tokenViewerRepository: ITokenViewerRepository;

  constructor(tokenViewerRepository: ITokenViewerRepository) {
    this.tokenViewerRepository = tokenViewerRepository;
  }

  public async getTokenForFlowNodeInstance(
      processModelId: string,
      correlationId: string,
      flowNodeId: string,
      identity: IIdentity): Promise<DataModels.TokenHistory.TokenHistoryGroup | undefined> {
    try {
      const tokenHistory: DataModels.TokenHistory.TokenHistoryGroup = {};
      const tokenForFlowNodeInstance: Array<DataModels.TokenHistory.TokenHistoryEntry> = await this.tokenViewerRepository
        .getTokenForFlowNodeInstance(processModelId, correlationId, flowNodeId, identity);

      tokenHistory[tokenForFlowNodeInstance[0].flowNodeId] = tokenForFlowNodeInstance;
      return tokenHistory;
    } catch (error) {
      return undefined;
    }
  }

  public async getTokenForFlowNodeByProcessInstanceId(
                  processInstanceId: string,
                  flowNodeId: string,
                  identity: IIdentity): Promise<DataModels.TokenHistory.TokenHistoryGroup | undefined> {
    try {
      return await this.tokenViewerRepository.getTokenForFlowNodeByProcessInstanceId(processInstanceId, flowNodeId, identity);
    } catch (error) {
      return undefined;
    }
  }
}
