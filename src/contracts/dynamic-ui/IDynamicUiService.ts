import {IIdentity} from '@essential-projects/iam_contracts';
import {DataModels} from '@process-engine/management_api_contracts';

export interface IDynamicUiService {
  finishUserTask(
    identity: IIdentity,
    processInstanceId: string,
    correlationId: string,
    userTaskInstanceId: string,
    userTaskResult: DataModels.UserTasks.UserTaskResult,
  ): void;

  getUserTask(
    identity: IIdentity,
    processInstanceId: string,
    userTaskId: string,
  ): Promise<DataModels.UserTasks.UserTask>;

  finishManualTask(
    identity: IIdentity,
    processInstanceId: string,
    correlationId: string,
    manualTaskInstanceId: string,
  ): void;

  getManualTask(
    identity: IIdentity,
    processInstanceId: string,
    manualTaskId: string,
  ): Promise<DataModels.ManualTasks.ManualTask>;
}
