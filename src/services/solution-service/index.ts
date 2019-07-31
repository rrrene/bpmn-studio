import {FrameworkConfiguration} from 'aurelia-framework';

import {SolutionService} from './SolutionService';

export async function configure(config: FrameworkConfiguration): Promise<void> {
  config.container.registerSingleton('SolutionService', SolutionService);
}
