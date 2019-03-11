import {inject} from 'aurelia-framework';

import {IIdentity} from '@essential-projects/iam_contracts';
import {DataModels} from '@process-engine/management_api_contracts';

import {ILiveExecutionTrackerRepository, ILiveExecutionTrackerService} from '../contracts/index';

@inject('LiveExecutionTrackerRepository')
export class LiveExecutionTrackerService implements ILiveExecutionTrackerService {
  private _liveExecutionTrackerRepository: ILiveExecutionTrackerRepository;

  constructor(liveExecutionTrackerRepository: ILiveExecutionTrackerRepository) {
    this._liveExecutionTrackerRepository = liveExecutionTrackerRepository;
  }

  public setIdentity(identity: IIdentity): void {
    this._liveExecutionTrackerRepository.setIdentity(identity);
  }

  public getCorrelationById(correlationId: string): Promise<DataModels.Correlations.Correlation> {
    return this._liveExecutionTrackerRepository.getCorrelationById(correlationId);
  }

  public getTokenHistoryGroupForProcessInstance(processInstanceId: string): Promise<DataModels.TokenHistory.TokenHistoryGroup | null> {
    return this._liveExecutionTrackerRepository.getTokenHistoryGroupForProcessInstance(processInstanceId);
  }

  public getActiveTokensForProcessInstance(processInstanceId: string): Promise<Array<DataModels.Kpi.ActiveToken>> {
    return this._liveExecutionTrackerRepository.getActiveTokensForProcessInstance(processInstanceId);
  }

  public getEmptyActivitiesForProcessInstance(processInstanceId: string): Promise<DataModels.EmptyActivities.EmptyActivityList | null> {
    return this._liveExecutionTrackerRepository.getEmptyActivitiesForProcessInstance(processInstanceId);
  }

  public getProcessModelById(processModelId: string): Promise<DataModels.ProcessModels.ProcessModel> {
    return this._liveExecutionTrackerRepository.getProcessModelById(processModelId);
  }

  public finishEmptyActivity(processInstanceId: string,
                             correlationId: string,
                             emptyActivity: DataModels.EmptyActivities.EmptyActivity): Promise<void> {

    return this._liveExecutionTrackerRepository.finishEmptyActivity(processInstanceId, correlationId, emptyActivity);
  }

  public createProcessEndedEventListener(correlationId: string, callback: Function): void {
    this._liveExecutionTrackerRepository.createProcessEndedEventListener(correlationId, callback);
  }
  public createProcessTerminatedEventListener(correlationId: string, callback: Function): void {
    this._liveExecutionTrackerRepository.createProcessTerminatedEventListener(correlationId, callback);
  }

  public createUserTaskWaitingEventListener(correlationId: string, processStopped: () => boolean, callback: Function): void {
    this._liveExecutionTrackerRepository.createUserTaskWaitingEventListener(correlationId, processStopped, callback);
  }
  public createUserTaskFinishedEventListener(correlationId: string, processStopped: () => boolean, callback: Function): void {
    this._liveExecutionTrackerRepository.createUserTaskFinishedEventListener(correlationId, processStopped, callback);
  }
  public createManualTaskWaitingEventListener(correlationId: string, processStopped: () => boolean, callback: Function): void {
    this._liveExecutionTrackerRepository.createManualTaskWaitingEventListener(correlationId, processStopped, callback);
  }
  public createManualTaskFinishedEventListener(correlationId: string, processStopped: () => boolean, callback: Function): void {
    this._liveExecutionTrackerRepository.createManualTaskFinishedEventListener(correlationId, processStopped, callback);
  }
  public createEmptyActivityWaitingEventListener(correlationId: string, processStopped: () => boolean, callback: Function): void {
    this._liveExecutionTrackerRepository.createEmptyActivityWaitingEventListener(correlationId, processStopped, callback);
  }
  public createEmptyActivityFinishedEventListener(correlationId: string, processStopped: () => boolean, callback: Function): void {
    this._liveExecutionTrackerRepository.createEmptyActivityFinishedEventListener(correlationId, processStopped, callback);
  }
}
