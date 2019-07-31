import {FrameworkConfiguration} from 'aurelia-framework';
import {HttpFetchClient} from './HttpFetchClient';

export async function configure(config: FrameworkConfiguration): Promise<void> {
  const httpFetchClient: HttpFetchClient = new HttpFetchClient();

  config.container.registerInstance('HttpFetchClient', httpFetchClient);
}
