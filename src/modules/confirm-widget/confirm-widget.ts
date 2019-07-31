import {bindable, inject} from 'aurelia-framework';

import {DataModels} from '@process-engine/management_api_contracts';

import {NotificationType} from '../../contracts/index';
import {NotificationService} from '../../services/notification-service/notification.service';

@inject('NotificationService')
export class ConfirmWidget {
  @bindable()
  public userTaskConfig: DataModels.UserTasks.UserTaskConfig;

  public formFields: Array<DataModels.UserTasks.UserTaskFormField>;
  public confirmMessage: string;

  private notificationService: NotificationService;

  constructor(notificationService: NotificationService) {
    this.notificationService = notificationService;
  }

  public attached(): void {
    const firstBooleanFormField: DataModels.UserTasks.UserTaskFormField = this.getFirstBooleanFormField();
    const userTaskHasNoBooleanFormField: boolean = firstBooleanFormField === undefined;

    if (userTaskHasNoBooleanFormField) {
      const errorMessage: string =
        'Confirm UserTasks must have a form field of type boolean that should get confirmed.';

      this.notificationService.showNotification(NotificationType.ERROR, errorMessage);
    }

    this.confirmMessage = firstBooleanFormField.label;
    this.formFields = this.getAllOtherFormFields(firstBooleanFormField);
  }

  // TODO: Move this to a UserTaskControlFactory
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
      default: {
        const notSupportedType: string = field.type !== undefined ? field.type : 'Custom Type';
        const errorMessage: string =
          `Not supported form field type: ${notSupportedType}.` +
          `</br>Please change the form field type with id "${field.id}".`;

        this.notificationService.showNotification(NotificationType.ERROR, errorMessage);
        return null;
      }
    }
  }

  private getAllOtherFormFields(
    formField: DataModels.UserTasks.UserTaskFormField,
  ): Array<DataModels.UserTasks.UserTaskFormField> {
    const booleanFormFieldIndex: number = this.userTaskConfig.formFields.indexOf(formField);

    const otherFormFields: Array<DataModels.UserTasks.UserTaskFormField> = this.userTaskConfig.formFields.slice();
    otherFormFields.splice(booleanFormFieldIndex, 1);

    return otherFormFields;
  }

  private getFirstBooleanFormField(): DataModels.UserTasks.UserTaskFormField {
    const formFields: Array<DataModels.UserTasks.UserTaskFormField> = this.userTaskConfig.formFields;

    return formFields.find((formField: DataModels.UserTasks.UserTaskFormField): boolean => {
      return formField.type === DataModels.UserTasks.UserTaskFormFieldType.boolean;
    });
  }
}
