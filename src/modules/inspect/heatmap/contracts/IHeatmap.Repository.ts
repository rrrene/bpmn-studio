import {IIdentity} from '@essential-projects/iam_contracts';
import {DataModels} from '@process-engine/management_api_contracts';

export interface IHeatmapRepository {
  getRuntimeInformationForProcessModel(processModelId: string): Promise<Array<DataModels.Kpi.FlowNodeRuntimeInformation>>;
  getProcess(processModelId: string): Promise<DataModels.ProcessModels.ProcessModel>;
  getActiveTokensForFlowNode(flowNodeId: string): Promise<Array<DataModels.Kpi.ActiveToken>>;
  setIdentity(identity: IIdentity): void;
}
