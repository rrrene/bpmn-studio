import { FrameworkConfiguration } from 'aurelia-framework';
import { DiagramCreationService } from './DiagramCreationService';

export async function configure(config: FrameworkConfiguration): Promise<void> {
  config.container.registerSingleton('DiagramCreationService', DiagramCreationService);
}
