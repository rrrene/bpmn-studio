import { FrameworkConfiguration } from 'aurelia-framework';

import { LiveExecutionTrackerRepository } from './repositories/live-execution-tracker.repository';
import { LiveExecutionTrackerService } from './services/live-execution-tracker.service';

export function configure(config: FrameworkConfiguration): void {
  config.container.registerSingleton('LiveExecutionTrackerRepository', LiveExecutionTrackerRepository);
  config.container.registerSingleton('LiveExecutionTrackerService', LiveExecutionTrackerService);
}
