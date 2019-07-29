import {FrameworkConfiguration} from 'aurelia-framework';

import {TokenViewerRepository} from './repository/token-viewer.repository';
import {TokenViewerService} from './service/token-viewer.service';

export function configure(config: FrameworkConfiguration): void {
  config.container.registerSingleton('TokenViewerRepository', TokenViewerRepository);
  config.container.registerSingleton('TokenViewerService', TokenViewerService);
}
