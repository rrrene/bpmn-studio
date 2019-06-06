import {inject} from 'aurelia-framework';

import {IIdentity} from '@essential-projects/iam_contracts';
import {DataModels} from '@process-engine/management_api_contracts';

import {IInspectCorrelationRepository, IInspectCorrelationService} from '../contracts';

@inject('InspectCorrelationRepository')
export class InspectCorrelationService implements IInspectCorrelationService {
  private _inspectCorrelationRepository: IInspectCorrelationRepository;

  constructor(inspectCorrelationRepository: IInspectCorrelationRepository) {
    this._inspectCorrelationRepository = inspectCorrelationRepository;
  }

  public getAllCorrelationsForProcessModelId(processModelId: string, identity: IIdentity): Promise<Array<DataModels.Correlations.Correlation>> {
    return this._inspectCorrelationRepository.getAllCorrelationsForProcessModelId(processModelId, identity);
  }

  public getLogsForCorrelation(correlation: DataModels.Correlations.Correlation, identity: IIdentity): Promise<Array<DataModels.Logging.LogEntry>> {
    return this._inspectCorrelationRepository.getLogsForCorrelation(correlation, identity);
  }

  public getLogsForProcessInstance(processModelId: string,
                                   processInstanceId: string,
                                   identity: IIdentity): Promise<Array<DataModels.Logging.LogEntry>> {

    return this._inspectCorrelationRepository.getLogsForProcessInstance(processModelId, processInstanceId, identity);
  }

  public async getTokenForFlowNodeInstance(
                              processModelId: string,
                              correlationId: string,
                              flowNodeId: string,
                              identity: IIdentity): Promise<DataModels.TokenHistory.TokenHistoryGroup | undefined> {
    try {
      const tokenHistory: DataModels.TokenHistory.TokenHistoryGroup = {};
      const tokenForFlowNodeInstance: Array<DataModels.TokenHistory.TokenHistoryEntry> = await this._inspectCorrelationRepository
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
      return await this._inspectCorrelationRepository.getTokenForFlowNodeByProcessInstanceId(processInstanceId, flowNodeId, identity);
    } catch (error) {
      return undefined;
    }
  }
}
