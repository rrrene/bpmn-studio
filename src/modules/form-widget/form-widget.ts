import {DataModels} from '@process-engine/management_api_contracts';
import {bindable, inject} from 'aurelia-framework';
import {NotificationType} from '../../contracts/index';
import {NotificationService} from '../../services/notification-service/notification.service';

@inject('NotificationService')
export class FormWidget {
  @bindable()
  public userTaskConfig: DataModels.UserTasks.UserTaskConfig;

  private notificationService: NotificationService;

  constructor(notificationService: NotificationService) {
    this.notificationService = notificationService;
  }

  public getFieldControl(field: DataModels.UserTasks.UserTaskFormField): string {
    switch (field.type) {
      case DataModels.UserTasks.UserTaskFormFieldType.enum:
        return 'dropdown';
      case DataModels.UserTasks.UserTaskFormFieldType.string:
        return 'textbox';
      case DataModels.UserTasks.UserTaskFormFieldType.boolean:
        return 'checkbox';
      case DataModels.UserTasks.UserTaskFormFieldType.long:
        return 'number';
      default:
        this.showNotSupportedMessage(field);

        return null;
    }
  }

  private showNotSupportedMessage(field: DataModels.UserTasks.UserTaskFormField): void {
    const formFieldHasCustomType: boolean = field.type === undefined;
    const notSupportedType: string = formFieldHasCustomType ? 'Custom Type' : field.type;

    const errorMessage: string =
      `Not supported form field type: ${notSupportedType}.` +
      `</br>Please change the form field type with id "${field.id}".`;

    this.notificationService.showNotification(NotificationType.ERROR, errorMessage);
  }
}
