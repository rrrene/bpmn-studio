import {IHttpClient} from '@essential-projects/http_contracts';
import {ExternalAccessor, ManagementApiClientService} from '@process-engine/management_api_client';
import {EventAggregator} from 'aurelia-event-aggregator';
import {FrameworkConfiguration} from 'aurelia-framework';
import environment from '../../environment';
import {HttpClientProxy} from './HttpClientProxy';

export async function configure(config: FrameworkConfiguration): Promise<void> {

  const httpClient: IHttpClient = config.container.get('HttpFetchClient');

  const configuredBaseRoute: string = window.localStorage.getItem('InternalProcessEngineRoute');

  const urlPrefix: string = `${configuredBaseRoute}/`;
  const proxiedHttpClient: HttpClientProxy = new HttpClientProxy(httpClient, urlPrefix);

  const clientService: ManagementApiClientService = createManagementApiClient(proxiedHttpClient, configuredBaseRoute);

  // register event to change url prefix
  const eventAggregator: EventAggregator = config.container.get(EventAggregator);
  eventAggregator.subscribe(environment.events.configPanel.processEngineRouteChanged, (newUrlPrefix: string) => {
    proxiedHttpClient.setUrlPrefix(`${newUrlPrefix}/`);
  });

  config.container.registerInstance('ManagementApiClientService', clientService);
}

function createManagementApiClient(httpClient: IHttpClient, socketUrl: string): ManagementApiClientService {

  const externalAccessor: ExternalAccessor = new ExternalAccessor(httpClient);

  externalAccessor.config = {
    socketUrl: socketUrl,
  };

  return new ManagementApiClientService(externalAccessor);
}
