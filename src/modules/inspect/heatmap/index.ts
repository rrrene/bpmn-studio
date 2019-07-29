import {FrameworkConfiguration} from 'aurelia-framework';

import {HeatmapRepository} from './repositories/heatmap.repository';
import {HeatmapService} from './services/heatmap.service';

export function configure(config: FrameworkConfiguration): void {
  config.container.registerSingleton('HeatmapRepository', HeatmapRepository);
  config.container.registerSingleton('HeatmapService', HeatmapService);
}
