import {IIdentity} from '@essential-projects/iam_contracts';
import {DataModels} from '@process-engine/management_api_contracts';
import {IFlowNodeAssociation} from '.';
import {IBpmnModeler, IElementRegistry, IOverlayManager} from '../../../../contracts';

export interface IHeatmapService {
  getRuntimeInformationForProcessModel(
    processModelId: string,
  ): Promise<Array<DataModels.Kpi.FlowNodeRuntimeInformation>>;
  getProcess(processModelId: string): Promise<DataModels.ProcessModels.ProcessModel>;
  getFlowNodeAssociations(elementRegistry: IElementRegistry): Array<IFlowNodeAssociation>;
  getColoredXML(
    associations: Array<IFlowNodeAssociation>,
    flowNodeRuntimeInformation: Array<DataModels.Kpi.FlowNodeRuntimeInformation>,
    modeler: IBpmnModeler,
  ): Promise<string>;
  getActiveTokensForFlowNode(flowNodeId: string): Promise<Array<DataModels.Kpi.ActiveToken>>;
  addOverlays(overlays: IOverlayManager, elementRegistry: IElementRegistry, processModelId: string): void;
  setIdentity(identity: IIdentity): void;
}
