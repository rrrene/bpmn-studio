import {inject} from 'aurelia-framework';

import {IIdentity} from '@essential-projects/iam_contracts';
import {DataModels, IManagementApi} from '@process-engine/management_api_contracts';

import {IInspectCorrelationRepository} from '../contracts';

@inject('ManagementApiClientService')
export class InspectCorrelationRepository implements IInspectCorrelationRepository {
  private managementApiService: IManagementApi;

  constructor(managementApi: IManagementApi) {
    this.managementApiService = managementApi;
  }

  public async getAllCorrelationsForProcessModelId(
    processModelId: string,
    identity: IIdentity,
  ): Promise<Array<DataModels.Correlations.Correlation>> {
    const allCorrelations: Array<
      DataModels.Correlations.Correlation
    > = await this.managementApiService.getAllCorrelations(identity);

    const correlationsForProcessModelId: Array<DataModels.Correlations.Correlation> = allCorrelations.filter(
      (correlation: DataModels.Correlations.Correlation) => {
        const processModelWithSameId: DataModels.Correlations.CorrelationProcessInstance = correlation.processInstances.find(
          (processModel: DataModels.Correlations.CorrelationProcessInstance) => {
            const isSearchedProcessModel: boolean = processModel.processModelId === processModelId;

            return isSearchedProcessModel;
          },
        );

        const processModelFound: boolean = processModelWithSameId !== undefined;

        return processModelFound;
      },
    );

    return correlationsForProcessModelId;
  }

  public async getLogsForCorrelation(
    correlation: DataModels.Correlations.Correlation,
    identity: IIdentity,
  ): Promise<Array<DataModels.Logging.LogEntry>> {
    const logsForAllProcessModelsOfCorrelation: Array<Array<DataModels.Logging.LogEntry>> = [];

    for (const processModel of correlation.processInstances) {
      const logsForProcessModel: Array<
        DataModels.Logging.LogEntry
      > = await this.managementApiService.getProcessModelLog(identity, processModel.processModelId, correlation.id);

      logsForAllProcessModelsOfCorrelation.push(logsForProcessModel);
    }

    const logsForCorrelation: Array<DataModels.Logging.LogEntry> = [].concat(...logsForAllProcessModelsOfCorrelation);

    return logsForCorrelation;
  }

  public async getLogsForProcessInstance(
    processModelId: string,
    processInstanceId: string,
    identity: IIdentity,
  ): Promise<Array<DataModels.Logging.LogEntry>> {
    const logs: Array<DataModels.Logging.LogEntry> = await this.managementApiService.getProcessInstanceLog(
      identity,
      processModelId,
      processInstanceId,
    );

    return logs;
  }

  public async getTokenForFlowNodeInstance(
    processModelId: string,
    correlationId: string,
    flowNodeId: string,
    identity: IIdentity,
  ): Promise<Array<DataModels.TokenHistory.TokenHistoryEntry>> {
    return this.managementApiService.getTokensForFlowNode(identity, correlationId, processModelId, flowNodeId);
  }

  public async getTokenForFlowNodeByProcessInstanceId(
    processInstanceId: string,
    flowNodeId: string,
    identity: IIdentity,
  ): Promise<DataModels.TokenHistory.TokenHistoryGroup> {
    return this.managementApiService.getTokensForFlowNodeByProcessInstanceId(identity, processInstanceId, flowNodeId);
  }
}
