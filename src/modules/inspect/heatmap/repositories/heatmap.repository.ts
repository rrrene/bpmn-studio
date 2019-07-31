import {inject} from 'aurelia-framework';

import {IIdentity} from '@essential-projects/iam_contracts';
import {DataModels, IManagementApi} from '@process-engine/management_api_contracts';

import {IHeatmapRepository} from '../contracts/IHeatmap.Repository';

@inject('ManagementApiClientService')
export class HeatmapRepository implements IHeatmapRepository {
  private managementApiClientService: IManagementApi;
  private identity: IIdentity;

  constructor(managementApiClientService: IManagementApi) {
    this.managementApiClientService = managementApiClientService;
  }

  public getRuntimeInformationForProcessModel(
    processModelId: string,
  ): Promise<Array<DataModels.Kpi.FlowNodeRuntimeInformation>> {
    return this.managementApiClientService.getRuntimeInformationForProcessModel(this.identity, processModelId);
  }

  public getProcess(processModelId: string): Promise<DataModels.ProcessModels.ProcessModel> {
    return this.managementApiClientService.getProcessModelById(this.identity, processModelId);
  }

  public getActiveTokensForFlowNode(flowNodeId: string): Promise<Array<DataModels.Kpi.ActiveToken>> {
    return this.managementApiClientService.getActiveTokensForFlowNode(this.identity, flowNodeId);
  }

  public setIdentity(identity: IIdentity): void {
    this.identity = identity;
  }
}
