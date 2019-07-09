import {NotificationType} from './constants';

export interface INotification {
  type: NotificationType;
  message: string;
  nonDisappearing: boolean;
  options?: ToastrOptions;
}
