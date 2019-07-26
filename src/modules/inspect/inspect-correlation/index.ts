import { FrameworkConfiguration } from 'aurelia-framework';

import { InspectCorrelationRepository } from './repositories/inspect-correlation.repository';
import { InspectCorrelationService } from './services/inspect-correlation.service';

export function configure(config: FrameworkConfiguration): void {
  config.container.registerSingleton('InspectCorrelationRepository', InspectCorrelationRepository);
  config.container.registerSingleton('InspectCorrelationService', InspectCorrelationService);
}
