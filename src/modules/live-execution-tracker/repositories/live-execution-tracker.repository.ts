import {inject} from 'aurelia-framework';

import {Subscription} from '@essential-projects/event_aggregator_contracts';
import {IIdentity} from '@essential-projects/iam_contracts';
import {DataModels, IManagementApi} from '@process-engine/management_api_contracts';
import {ActiveToken} from '@process-engine/management_api_contracts/dist/data_models/kpi/index';
import {
  EndEventReachedMessage,
  TerminateEndEventReachedMessage,
} from '@process-engine/management_api_contracts/dist/messages/bpmn_events/index';

import {ILiveExecutionTrackerRepository, RequestError} from '../contracts/index';

@inject('ManagementApiClientService')
export class LiveExecutionTrackerRepository implements ILiveExecutionTrackerRepository {
  private managementApiClient: IManagementApi;
  private identity: IIdentity;

  private maxRetries: number = 5;
  private retryDelayInMs: number = 500;

  constructor(managementApiClientService: IManagementApi) {
    this.managementApiClient = managementApiClientService;
  }

  public async getFlowNodeInstancesForProcessInstance(
    processInstanceId: string,
  ): Promise<Array<DataModels.FlowNodeInstances.FlowNodeInstance>> {
    return this.managementApiClient.getFlowNodeInstancesForProcessInstance(this.identity, processInstanceId);
  }

  public async getCorrelationById(correlationId: string): Promise<DataModels.Correlations.Correlation> {
    // This is necessary because the managementApi sometimes throws an error when the correlation is not yet existing.
    for (let retries: number = 0; retries < this.maxRetries; retries++) {
      try {
        return await this.managementApiClient.getCorrelationById(this.identity, correlationId);
      } catch {
        await new Promise((resolve: Function): void => {
          setTimeout(() => {
            resolve();
          }, this.retryDelayInMs);
        });
      }
    }

    return undefined;
  }

  public async isProcessInstanceActive(processInstanceId: string): Promise<boolean> {
    const getActiveTokens: Function = async (): Promise<Array<ActiveToken> | RequestError> => {
      for (let retries: number = 0; retries < this.maxRetries; retries++) {
        try {
          return await this.managementApiClient.getActiveTokensForProcessInstance(this.identity, processInstanceId);
        } catch (error) {
          const errorIsConnectionLost: boolean = error.message === 'Failed to fetch';

          if (errorIsConnectionLost) {
            return RequestError.ConnectionLost;
          }
        }
      }

      return RequestError.OtherError;
    };

    const activeTokensOrRequestError: Array<ActiveToken> | RequestError = await getActiveTokens();

    const couldNotGetActiveTokens: boolean =
      activeTokensOrRequestError === RequestError.ConnectionLost ||
      activeTokensOrRequestError === RequestError.OtherError;
    if (couldNotGetActiveTokens) {
      const requestError: RequestError = activeTokensOrRequestError as RequestError;

      throw requestError;
    }

    const allActiveTokens: Array<ActiveToken> = activeTokensOrRequestError as Array<ActiveToken>;

    const correlationIsActive: boolean = allActiveTokens.length > 0;

    return correlationIsActive;
  }

  public async getTokenHistoryGroupForProcessInstance(
    processInstanceId: string,
  ): Promise<DataModels.TokenHistory.TokenHistoryGroup | null> {
    for (let retries: number = 0; retries < this.maxRetries; retries++) {
      try {
        return await this.managementApiClient.getTokensForProcessInstance(this.identity, processInstanceId);
      } catch {
        await new Promise((resolve: Function): void => {
          setTimeout(() => {
            resolve();
          }, this.retryDelayInMs);
        });
      }
    }

    return null;
  }

  public async getActiveTokensForProcessInstance(processInstanceId: string): Promise<Array<ActiveToken> | null> {
    for (let retries: number = 0; retries < this.maxRetries; retries++) {
      try {
        return await this.managementApiClient.getActiveTokensForProcessInstance(this.identity, processInstanceId);
      } catch {
        await new Promise((resolve: Function): void => {
          setTimeout(() => {
            resolve();
          }, this.retryDelayInMs);
        });
      }
    }

    return null;
  }

  public async getEmptyActivitiesForProcessInstance(
    processInstanceId: string,
  ): Promise<DataModels.EmptyActivities.EmptyActivityList | null> {
    for (let retries: number = 0; retries < this.maxRetries; retries++) {
      try {
        return await this.managementApiClient.getEmptyActivitiesForProcessInstance(this.identity, processInstanceId);
      } catch {
        await new Promise((resolve: Function): void => {
          setTimeout(() => {
            resolve();
          }, this.retryDelayInMs);
        });
      }
    }

    return null;
  }

  public async finishEmptyActivity(
    processInstanceId: string,
    correlationId: string,
    emptyActivity: DataModels.EmptyActivities.EmptyActivity,
  ): Promise<void> {
    return this.managementApiClient.finishEmptyActivity(
      this.identity,
      processInstanceId,
      correlationId,
      emptyActivity.flowNodeInstanceId,
    );
  }

  public async getProcessModelById(processModelId: string): Promise<DataModels.ProcessModels.ProcessModel> {
    return this.managementApiClient.getProcessModelById(this.identity, processModelId);
  }

  public setIdentity(identity: IIdentity): void {
    this.identity = identity;
  }

  public createProcessEndedEventListener(processInstanceId: string, callback: Function): Promise<Subscription> {
    return this.managementApiClient.onProcessEnded(this.identity, (message: EndEventReachedMessage): void => {
      const eventIsForAnotherProcessInstance: boolean = message.processInstanceId !== processInstanceId;
      if (eventIsForAnotherProcessInstance) {
        return;
      }

      callback();
    });
  }

  public createProcessTerminatedEventListener(processInstanceId: string, callback: Function): Promise<Subscription> {
    return this.managementApiClient.onProcessTerminated(
      this.identity,
      (message: TerminateEndEventReachedMessage): void => {
        const eventIsForAnotherProcessInstance: boolean = message.processInstanceId !== processInstanceId;
        if (eventIsForAnotherProcessInstance) {
          return;
        }

        callback();
      },
    );
  }

  public createUserTaskWaitingEventListener(processInstanceId: string, callback: Function): Promise<Subscription> {
    return this.managementApiClient.onUserTaskWaiting(
      this.identity,
      (message: TerminateEndEventReachedMessage): void => {
        const eventIsForAnotherProcessInstance: boolean = message.processInstanceId !== processInstanceId;
        if (eventIsForAnotherProcessInstance) {
          return;
        }

        callback();
      },
    );
  }

  public createActivityReachedEventListener(processInstanceId: string, callback: Function): Promise<Subscription> {
    return this.managementApiClient.onActivityReached(
      this.identity,
      (message: TerminateEndEventReachedMessage): void => {
        const eventIsForAnotherProcessInstance: boolean = message.processInstanceId !== processInstanceId;
        if (eventIsForAnotherProcessInstance) {
          return;
        }

        callback();
      },
    );
  }

  public createActivityFinishedEventListener(processInstanceId: string, callback: Function): Promise<Subscription> {
    return this.managementApiClient.onActivityFinished(
      this.identity,
      (message: TerminateEndEventReachedMessage): void => {
        const eventIsForAnotherProcessInstance: boolean = message.processInstanceId !== processInstanceId;
        if (eventIsForAnotherProcessInstance) {
          return;
        }

        callback();
      },
    );
  }

  public createUserTaskFinishedEventListener(processInstanceId: string, callback: Function): Promise<Subscription> {
    return this.managementApiClient.onUserTaskFinished(
      this.identity,
      (message: TerminateEndEventReachedMessage): void => {
        const eventIsForAnotherProcessInstance: boolean = message.processInstanceId !== processInstanceId;
        if (eventIsForAnotherProcessInstance) {
          return;
        }

        callback();
      },
    );
  }

  public createManualTaskWaitingEventListener(processInstanceId: string, callback: Function): Promise<Subscription> {
    return this.managementApiClient.onManualTaskWaiting(
      this.identity,
      (message: TerminateEndEventReachedMessage): void => {
        const eventIsForAnotherProcessInstance: boolean = message.processInstanceId !== processInstanceId;
        if (eventIsForAnotherProcessInstance) {
          return;
        }

        callback();
      },
    );
  }

  public createManualTaskFinishedEventListener(processInstanceId: string, callback: Function): Promise<Subscription> {
    return this.managementApiClient.onManualTaskFinished(
      this.identity,
      (message: TerminateEndEventReachedMessage): void => {
        const eventIsForAnotherProcessInstance: boolean = message.processInstanceId !== processInstanceId;
        if (eventIsForAnotherProcessInstance) {
          return;
        }

        callback();
      },
    );
  }

  public createEmptyActivityWaitingEventListener(processInstanceId: string, callback: Function): Promise<Subscription> {
    return this.managementApiClient.onEmptyActivityWaiting(
      this.identity,
      (message: TerminateEndEventReachedMessage): void => {
        const eventIsForAnotherProcessInstance: boolean = message.processInstanceId !== processInstanceId;
        if (eventIsForAnotherProcessInstance) {
          return;
        }

        callback();
      },
    );
  }

  public createEmptyActivityFinishedEventListener(
    processInstanceId: string,
    callback: Function,
  ): Promise<Subscription> {
    return this.managementApiClient.onEmptyActivityFinished(
      this.identity,
      (message: TerminateEndEventReachedMessage): void => {
        const eventIsForAnotherProcessInstance: boolean = message.processInstanceId !== processInstanceId;
        if (eventIsForAnotherProcessInstance) {
          return;
        }

        callback();
      },
    );
  }

  public createBoundaryEventTriggeredEventListener(
    processInstanceId: string,
    callback: Function,
  ): Promise<Subscription> {
    return this.managementApiClient.onBoundaryEventTriggered(
      this.identity,
      (message: TerminateEndEventReachedMessage): void => {
        const eventIsForAnotherProcessInstance: boolean = message.processInstanceId !== processInstanceId;
        if (eventIsForAnotherProcessInstance) {
          return;
        }

        callback();
      },
    );
  }

  public createIntermediateThrowEventTriggeredEventListener(
    processInstanceId: string,
    callback: Function,
  ): Promise<Subscription> {
    return this.managementApiClient.onIntermediateThrowEventTriggered(
      this.identity,
      (message: TerminateEndEventReachedMessage): void => {
        const eventIsForAnotherProcessInstance: boolean = message.processInstanceId !== processInstanceId;
        if (eventIsForAnotherProcessInstance) {
          return;
        }

        callback();
      },
    );
  }

  public createIntermediateCatchEventReachedEventListener(
    processInstanceId: string,
    callback: Function,
  ): Promise<Subscription> {
    return this.managementApiClient.onIntermediateCatchEventReached(
      this.identity,
      (message: TerminateEndEventReachedMessage): void => {
        const eventIsForAnotherProcessInstance: boolean = message.processInstanceId !== processInstanceId;
        if (eventIsForAnotherProcessInstance) {
          return;
        }

        callback();
      },
    );
  }

  public createIntermediateCatchEventFinishedEventListener(
    processInstanceId: string,
    callback: Function,
  ): Promise<Subscription> {
    return this.managementApiClient.onIntermediateCatchEventFinished(
      this.identity,
      (message: TerminateEndEventReachedMessage): void => {
        const eventIsForAnotherProcessInstance: boolean = message.processInstanceId !== processInstanceId;
        if (eventIsForAnotherProcessInstance) {
          return;
        }

        callback();
      },
    );
  }

  public removeSubscription(subscription: Subscription): Promise<void> {
    return this.managementApiClient.removeSubscription(this.identity, subscription);
  }

  public terminateProcess(processInstanceId: string): Promise<void> {
    return this.managementApiClient.terminateProcessInstance(this.identity, processInstanceId);
  }
}
