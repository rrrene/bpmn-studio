import {FrameworkConfiguration} from 'aurelia-framework';
import {NotificationService} from './notification.service';

export function configure(config: FrameworkConfiguration): void {
  config.container.registerSingleton('NotificationService', NotificationService);
}
