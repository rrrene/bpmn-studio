import {FrameworkConfiguration} from 'aurelia-framework';
import {DateService} from './date.service';

export function configure(config: FrameworkConfiguration): void {
  config.container.registerSingleton('DateService', DateService);
}
