import {inject} from 'aurelia-framework';

import {IIdentity} from '@essential-projects/iam_contracts';
import {DataModels, IManagementApi} from '@process-engine/management_api_contracts';
import {ActiveToken} from '@process-engine/management_api_contracts/dist/data_models/kpi/index';
import {EndEventReachedMessage, TerminateEndEventReachedMessage} from '@process-engine/management_api_contracts/dist/messages/bpmn_events/index';

import {ILiveExecutionTrackerRepository} from '../contracts/index';

@inject('ManagementApiClientService')
export class LiveExecutionTrackerRepository implements ILiveExecutionTrackerRepository {

  private _managementApiClient: IManagementApi;
  private _identity: IIdentity;

  private _maxRetries: number = 5;
  private _timeout: number = 500;

  constructor(managementApiClientService: IManagementApi) {
    this._managementApiClient = managementApiClientService;
  }

  public async getCorrelationById(correlationId: string): Promise<DataModels.Correlations.Correlation> {
    // This is necessary because the managementApi sometimes throws an error when the correlation is not yet existing.
    for (let retries: number = 0; retries < this._maxRetries; retries++) {
      try {
        return await this._managementApiClient.getCorrelationById(this._identity, correlationId);
      } catch {
        await new Promise((resolve: Function): void => {
          setTimeout(() => {
            resolve();
          }, this._timeout);
        });
      }
    }

    return undefined;
  }

  public async getTokenHistoryGroupForProcessInstance(processInstanceId: string): Promise<DataModels.TokenHistory.TokenHistoryGroup | null> {
    for (let retries: number = 0; retries < this._maxRetries; retries++) {
      try {
        return await this._managementApiClient.getTokensForProcessInstance(this._identity, processInstanceId);
      } catch {
        await new Promise((resolve: Function): void => {
          setTimeout(() => {
            resolve();
          }, this._timeout);
        });
      }
    }

    return null;
  }

  public async getActiveTokensForProcessInstance(processInstanceId: string): Promise<Array<ActiveToken> | null> {
    for (let retries: number = 0; retries < this._maxRetries; retries++) {
      try {
        return await this._managementApiClient.getActiveTokensForProcessInstance(this._identity, processInstanceId);
      } catch {
        await new Promise((resolve: Function): void => {
          setTimeout(() => {
            resolve();
          }, this._timeout);
        });
      }
    }

    return null;
  }

  public async getEmptyActivitiesForProcessInstance(processInstanceId: string): Promise<DataModels.EmptyActivities.EmptyActivityList | null> {
    for (let retries: number = 0; retries < this._maxRetries; retries++) {
      try {
        return await this._managementApiClient.getEmptyActivitiesForProcessInstance(this._identity, processInstanceId);
      } catch {
        await new Promise((resolve: Function): void => {
          setTimeout(() => {
            resolve();
          }, this._timeout);
        });
      }
    }

    return null;
  }

  public async finishEmptyActivity(processInstanceId: string,
                                   correlationId: string,
                                   emptyActivity: DataModels.EmptyActivities.EmptyActivity): Promise<void> {

    return this._managementApiClient.finishEmptyActivity(this._identity,
                                                         processInstanceId,
                                                         correlationId,
                                                         emptyActivity.flowNodeInstanceId);
  }

  public async getProcessModelById(processModelId: string): Promise<DataModels.ProcessModels.ProcessModel> {
    return await this._managementApiClient.getProcessModelById(this._identity, processModelId);
  }

  public setIdentity(identity: IIdentity): void {
    this._identity = identity;
  }

  public createProcessEndedEventListener(correlationId: string, callback: Function): void {
    this._managementApiClient.onProcessEnded(this._identity, (message: EndEventReachedMessage): void => {
      if (message.correlationId !== correlationId) {
        this.createProcessEndedEventListener(correlationId, callback);

        return;
      }

      callback();
    }, true);
  }

  public createProcessTerminatedEventListener(correlationId: string, callback: Function): void {
    this._managementApiClient.onProcessTerminated(this._identity, (message: TerminateEndEventReachedMessage): void => {
      if (message.correlationId !== correlationId) {
        this.createProcessTerminatedEventListener(correlationId, callback);

        return;
      }

      callback();
    }, true);
  }

  public createUserTaskWaitingEventListener(correlationId: string, processStopped: () => boolean, callback: Function): void {
    this._managementApiClient.onUserTaskWaiting(this._identity, (message: TerminateEndEventReachedMessage): void => {
      if (message.correlationId !== correlationId) {
        this.createUserTaskWaitingEventListener(correlationId, processStopped, callback);

        return;
      }

      callback();

      if (!processStopped()) {
        this.createUserTaskWaitingEventListener(correlationId, processStopped, callback);
      }
    }, true);
  }

  public createUserTaskFinishedEventListener(correlationId: string, processStopped: () => boolean, callback: Function): void {
    this._managementApiClient.onUserTaskFinished(this._identity, (message: TerminateEndEventReachedMessage): void => {
      if (message.correlationId !== correlationId) {
        this.createUserTaskFinishedEventListener(correlationId, processStopped, callback);

        return;
      }

      callback();

      if (!processStopped()) {
        this.createUserTaskFinishedEventListener(correlationId, processStopped, callback);
      }
    }, true);
  }

  public createManualTaskWaitingEventListener(correlationId: string, processStopped: () => boolean, callback: Function): void {
    this._managementApiClient.onManualTaskWaiting(this._identity, (message: TerminateEndEventReachedMessage): void => {
      if (message.correlationId !== correlationId) {
        this.createManualTaskWaitingEventListener(correlationId, processStopped, callback);

        return;
      }

      callback();

      if (!processStopped()) {
        this.createManualTaskWaitingEventListener(correlationId, processStopped, callback);
      }
    }, true);
  }

  public createManualTaskFinishedEventListener(correlationId: string, processStopped: () => boolean, callback: Function): void {
    this._managementApiClient.onManualTaskFinished(this._identity, (message: TerminateEndEventReachedMessage): void => {
      if (message.correlationId !== correlationId) {
        this.createManualTaskFinishedEventListener(correlationId, processStopped, callback);

        return;
      }

      callback();

      if (!processStopped()) {
        this.createManualTaskFinishedEventListener(correlationId, processStopped, callback);
      }
    }, true);
  }

  public createEmptyActivityWaitingEventListener(correlationId: string, processStopped: () => boolean, callback: Function): void {
    this._managementApiClient.onEmptyActivityWaiting(this._identity, (message: TerminateEndEventReachedMessage): void => {
      if (message.correlationId !== correlationId) {
        this.createEmptyActivityWaitingEventListener(correlationId, processStopped, callback);

        return;
      }

      callback();

      if (!processStopped()) {
        this.createEmptyActivityWaitingEventListener(correlationId, processStopped, callback);
      }
    }, true);
  }

  public createEmptyActivityFinishedEventListener(correlationId: string, processStopped: () => boolean, callback: Function): void {
    this._managementApiClient.onEmptyActivityFinished(this._identity, (message: TerminateEndEventReachedMessage): void => {
      if (message.correlationId !== correlationId) {
        this.createEmptyActivityFinishedEventListener(correlationId, processStopped, callback);

        return;
      }

      callback();

      if (!processStopped()) {
        this.createEmptyActivityFinishedEventListener(correlationId, processStopped, callback);
      }
    }, true);
  }
}
