import {bindable, inject} from 'aurelia-framework';

import * as clipboard from 'clipboard-polyfill';

import {DataModels} from '@process-engine/management_api_contracts';

import {
  ILogSortSettings,
  ISolutionEntry,
  LogSortProperty,
  NotificationType,
} from '../../../../../../../contracts/index';
import {getBeautifiedDate} from '../../../../../../../services/date-service/date.service';
import {NotificationService} from '../../../../../../../services/notification-service/notification.service';
import {IInspectCorrelationService} from '../../../../contracts';

interface IClipboard {
  writeText?(text: string): void;
}

@inject('NotificationService', 'InspectCorrelationService')
export class LogViewer {
  @bindable public log: Array<DataModels.Logging.LogEntry>;
  @bindable public processInstance: DataModels.Correlations.CorrelationProcessInstance;
  @bindable public activeSolutionEntry: ISolutionEntry;
  public logSortProperty: typeof LogSortProperty = LogSortProperty;
  public sortedLog: Array<DataModels.Logging.LogEntry>;
  public sortSettings: ILogSortSettings = {
    ascending: false,
    sortProperty: undefined,
  };

  private notificationService: NotificationService;
  private inspectCorrelationService: IInspectCorrelationService;

  constructor(notificationService: NotificationService, inspectCorrelationService: IInspectCorrelationService) {
    this.notificationService = notificationService;
    this.inspectCorrelationService = inspectCorrelationService;
  }

  public async processInstanceChanged(): Promise<void> {
    const noProcessInstanceSet: boolean = this.processInstance === undefined;
    if (noProcessInstanceSet) {
      return;
    }

    setTimeout(async () => {
      this.log = await this.inspectCorrelationService.getLogsForProcessInstance(
        this.processInstance.processModelId,
        this.processInstance.processInstanceId,
        this.activeSolutionEntry.identity,
      );

      this.sortSettings = {
        ascending: false,
        sortProperty: undefined,
      };

      this.sortList(LogSortProperty.Time);
    }, 0);
  }

  public copyToClipboard(textToCopy: string): void {
    (clipboard as IClipboard).writeText(textToCopy);

    this.notificationService.showNotification(NotificationType.SUCCESS, 'Successfully copied to clipboard.');
  }

  public getDateStringFromTimestamp(timestamp: string): string {
    const dateString: string = getBeautifiedDate(timestamp);

    return dateString;
  }

  public sortList(property: LogSortProperty): void {
    this.sortedLog = [];
    const isSamePropertyAsPrevious: boolean = this.sortSettings.sortProperty === property;
    const ascending: boolean = isSamePropertyAsPrevious ? !this.sortSettings.ascending : true;

    this.sortSettings.ascending = ascending;
    this.sortSettings.sortProperty = property;

    const sortPropertyIsTime: boolean = property === LogSortProperty.Time;

    const sortedLog: Array<DataModels.Logging.LogEntry> = sortPropertyIsTime
      ? this.getSortedLogByDate()
      : this.getSortedLogByProperty(property);

    this.sortedLog = ascending ? sortedLog : sortedLog.reverse();
  }

  private getSortedLogByProperty(property: LogSortProperty): Array<DataModels.Logging.LogEntry> {
    const sortedLog: Array<DataModels.Logging.LogEntry> = this.log.sort(
      (firstEntry: DataModels.Logging.LogEntry, secondEntry: DataModels.Logging.LogEntry) => {
        // FlowNodeId and FlowNodeInstanceId can be 'undefined', if the LogEntry is for a ProcessInstance.
        // Using 'greaterThan' in conjunction with 'undefined' will always be "false", which will mess up the sorting.
        // So these cases must be handled separately.
        const firstFieldIsUndefined: boolean = !firstEntry[property];
        if (firstFieldIsUndefined) {
          return -1;
        }

        const secondFieldIsUndefined: boolean = !secondEntry[property];
        if (secondFieldIsUndefined) {
          return 1;
        }

        const firstEntryIsBigger: boolean = firstEntry[property] > secondEntry[property];
        if (firstEntryIsBigger) {
          return 1;
        }

        const secondEntryIsBigger: boolean = firstEntry[property] < secondEntry[property];
        if (secondEntryIsBigger) {
          return -1;
        }

        return 0;
      },
    );

    return sortedLog;
  }

  private getSortedLogByDate(): Array<DataModels.Logging.LogEntry> {
    const sortedLog: Array<DataModels.Logging.LogEntry> = this.log.sort(
      (firstEntry: DataModels.Logging.LogEntry, secondEntry: DataModels.Logging.LogEntry) => {
        const firstCorrelationDate: Date = new Date(firstEntry.timeStamp);
        const secondCorrelationDate: Date = new Date(secondEntry.timeStamp);

        const firstEntryIsBigger: boolean = firstCorrelationDate.getTime() > secondCorrelationDate.getTime();
        if (firstEntryIsBigger) {
          return 1;
        }

        const secondEntryIsBigger: boolean = firstCorrelationDate.getTime() < secondCorrelationDate.getTime();
        if (secondEntryIsBigger) {
          return -1;
        }

        return 0;
      },
    );

    return sortedLog;
  }
}
