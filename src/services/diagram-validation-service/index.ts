import { FrameworkConfiguration } from 'aurelia-framework';
import { DiagramValidationService } from './DiagramValidationService';

export async function configure(config: FrameworkConfiguration): Promise<void> {
  config.container.registerSingleton('DiagramValidationService', DiagramValidationService);
}
