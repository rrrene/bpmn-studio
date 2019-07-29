import {inject} from 'aurelia-framework';

import {IIdentity} from '@essential-projects/iam_contracts';
import {DataModels, IManagementApi} from '@process-engine/management_api_contracts';

import {IHeatmapRepository} from '../contracts/IHeatmap.Repository';

@inject('ManagementApiClientService')
export class HeatmapRepository implements IHeatmapRepository {
  private _managementApiClientService: IManagementApi;
  private _identity: IIdentity;

  constructor(managementApiClientService: IManagementApi) {
    this._managementApiClientService = managementApiClientService;
  }

  public getRuntimeInformationForProcessModel(
    processModelId: string,
  ): Promise<Array<DataModels.Kpi.FlowNodeRuntimeInformation>> {
    return this._managementApiClientService.getRuntimeInformationForProcessModel(this._identity, processModelId);
  }

  public getProcess(processModelId: string): Promise<DataModels.ProcessModels.ProcessModel> {
    return this._managementApiClientService.getProcessModelById(this._identity, processModelId);
  }

  public getActiveTokensForFlowNode(flowNodeId: string): Promise<Array<DataModels.Kpi.ActiveToken>> {
    return this._managementApiClientService.getActiveTokensForFlowNode(this._identity, flowNodeId);
  }

  public setIdentity(identity: IIdentity): void {
    this._identity = identity;
  }
}
