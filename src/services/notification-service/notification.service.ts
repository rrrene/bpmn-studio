import { inject } from 'aurelia-dependency-injection';
import { EventAggregator } from 'aurelia-event-aggregator';
import toastr from 'toastr';
import { INotification, NotificationType } from '../../contracts/index';

@inject(EventAggregator)
export class NotificationService {
  private _eventAggregator: EventAggregator;
  private _toastrInstance: Toastr;
  private _savedNotifications: Array<INotification> = [];

  constructor(eventAggregator: EventAggregator) {
    this._eventAggregator = eventAggregator;
    this._eventAggregator.subscribeOnce('router:navigation:complete', () => {
      this._setToastrInstance(toastr);
    });
  }

  /**
   * Shows a automatically-disappearing notification message to the user;
   * the notification will disappear after a certain amount of time (@see toastr documenation).
   *
   * @argument type The severity of the notification (@see NotificationType for possible severity level).
   * @argument message The message to display as String.
   */
  public showNotification(type: NotificationType, message: string, options?: ToastrOptions): void {
    const notification: INotification = {
      type: type,
      message: message,
      nonDisappearing: false,
      options: options
    };
    this._queueOrDisplay(notification);
  }

  /**
   * Shows a non-disappearing notification message to the user, with a close button;
   * the notification will disappear when the user hit the close button.
   *
   * @argument type The severity of the notification (@see NotificationType for possible severity level).
   * @argument message The message to display as String.
   */
  public showNonDisappearingNotification(type: NotificationType, message: string, options?: ToastrOptions): void {
    const notification: INotification = {
      type: type,
      message: message,
      nonDisappearing: true,
      options: options
    };
    this._queueOrDisplay(notification);
  }

  private _queueOrDisplay(notification: INotification): void {
    if (this._toastrInstance === undefined) {
      this._savedNotifications.push(notification);
      return;
    }

    this._publishNotificationToToastr(notification);
  }

  private _setToastrInstance(toastrInstance: Toastr): void {
    this._toastrInstance = toastrInstance;

    this._toastrInstance.options = {
      positionClass: 'toast-bottom-left'
    };

    this._initializeToastr();
    for (const notification of this._savedNotifications) {
      this._publishNotificationToToastr(notification);
    }
    this._savedNotifications = [];
  }

  private _publishNotificationToToastr(notification: INotification): void {
    const toastrOptions: ToastrOptions = this._mapOptionsToToastrOptions(notification);

    switch (notification.type) {
      case NotificationType.SUCCESS:
        this._toastrInstance.success(notification.message, undefined, toastrOptions);
        break;
      case NotificationType.ERROR:
        this._toastrInstance.error(notification.message, undefined, toastrOptions);
        break;
      case NotificationType.INFO:
        this._toastrInstance.info(notification.message, undefined, toastrOptions);
        break;
      case NotificationType.WARNING:
        this._toastrInstance.warning(notification.message, undefined, toastrOptions);
        break;
      default:
        break;
    }
  }

  private _initializeToastr(): void {
    this._toastrInstance.options.preventDuplicates = true;
  }

  private _mapOptionsToToastrOptions(notification: INotification): ToastrOptions {
    if (notification.nonDisappearing) {
      return {
        closeButton: true,
        closeOnHover: false,
        timeOut: -1,
        ...notification.options
      };
    }
    return notification.options;
  }
}
