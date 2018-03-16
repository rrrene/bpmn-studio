import {IUserTaskConfig} from '@process-engine/bpmn-studio_client';

export interface IDynamicUiService {
  sendProceedAction(action: string, widget: IUserTaskConfig): void;
  getUserTaskConfig(userTaskId: string): Promise<IUserTaskConfig>;
}
