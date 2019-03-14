import {Aurelia} from 'aurelia-framework';

import {NotificationType} from './contracts/index';
import environment from './environment';
import {NotificationService} from './services/notification-service/notification.service';

import {oidcConfig} from './open-id-connect-configuration';

export function configure(aurelia: Aurelia): void {

  if (navigator.cookieEnabled === false) {
    const url: string = location.href;
    throw new Error(`In order to use the web version of BPMN Studio please enable cookies for this URL: ${url}.`);
  }

  if ((window as any).nodeRequire) {
    const ipcRenderer: any = (window as any).nodeRequire('electron').ipcRenderer;
    const newHost: string = ipcRenderer.sendSync('get_host');

    /**
     * Currently the internal PE is always connected via http.
     * This will be subject to change.
     */
    const processEngineBaseRouteWithProtocol: string = `http://${newHost}`;

    localStorage.setItem('InternalProcessEngineRoute', processEngineBaseRouteWithProtocol);

    aurelia.container.registerInstance('InternalProcessEngineBaseRoute', processEngineBaseRouteWithProtocol);
  } else {
    localStorage.setItem('InternalProcessEngineRoute', environment.baseRoute);
    aurelia.container.registerInstance('InternalProcessEngineBaseRoute', null);
  }

  aurelia.use
    .standardConfiguration()
    .globalResources('modules/custom_elements/modal/modal.html')
    .feature('modules/fetch-http-client')
    .feature('services/dynamic-ui-service')
    .feature('services/notification-service')
    .feature('services/diagram-validation-service')
    .feature('modules/management-api_client')
    .feature('services/authentication-service')
    /*
     * The services/solution-explorer-services has a hard dependency on
     * EventAggregator and AuthenticationService.
     */
    .feature('services/solution-explorer-services')
    .feature('modules/inspect/inspect-correlation')
    .feature('services/diagram-creation-service')
    .feature('services/solution-service')
    .feature('modules/inspect/heatmap')
    .plugin('aurelia-bootstrap')
    .plugin('aurelia-validation')
    .plugin('aurelia-open-id-connect', () => oidcConfig);

  if (environment.debug) {
    aurelia.use.developmentLogging();
  }

  if (environment.testing) {
    aurelia.use.plugin('aurelia-testing');
  }

  aurelia.start().then(() => {
    aurelia.setRoot();

    const applicationRunsInElectron: boolean = (window as any).nodeRequire !== undefined;
    if (applicationRunsInElectron) {

      const ipcRenderer: any = (window as any).nodeRequire('electron').ipcRenderer;
      // subscribe to processengine status
      ipcRenderer.send('add_internal_processengine_status_listener');

      // wait for status to be reported

      ipcRenderer.on('internal_processengine_status', (event: any, status: string, error: string) => {
        if (status !== 'error') {
          return;
        }
        /* This is the URL to an issue in GitHub, describing
         * what the user can do about this failure.
         *
         * TODO: Implement a proper FAQ section and link to that.
         */
        // tslint:disable-next-line: max-line-length
        const targetHref: string = `<a href="javascript:nodeRequire('open')('https://github.com/process-engine/bpmn-studio/issues/316')">click here</a>`;

        const errorMessage: string = `Failed to start ProcessEngine. For further information ${targetHref}.`;
        const notificationService: NotificationService = aurelia.container.get('NotificationService');

        notificationService.showNonDisappearingNotification(NotificationType.ERROR, errorMessage);
      });
    }

    if (applicationRunsInElectron) {
      const ipcRenderer: any = (window as any).nodeRequire('electron').ipcRenderer;
      const notificationService: NotificationService = aurelia.container.get('NotificationService');

      ipcRenderer.send('app_ready');

      ipcRenderer.on('update_error', () => {
        notificationService.showNotification(NotificationType.INFO, 'Update Error!');
      });

      ipcRenderer.on('update_available', (event: any, version: string) => {
        // tslint:disable-next-line max-line-length
        const installButton: string = `<a class="btn btn-default" style="color: #000000;" href="javascript:nodeRequire('electron').ipcRenderer.send('download_update')">Download</a>`;
        const cancelButton: string = `<a class="btn btn-default" style="color: #000000;" href="#">Cancel</a>`;

        const messageTitle: string = `<h5>Version ${version} available.</h5>
                                      <h6>
                                        <a href="#" onclick="showReleaseNotes(event)">
                                          Click here for Releasenotes
                                        </a>
                                      </h6>
                                      <script>
                                        function showReleaseNotes(event) {
                                          event.stopPropagation();
                                          nodeRequire('electron').ipcRenderer.send('show_release_notes');
                                        }
                                      </script>`;
        const messageBody: string = `${cancelButton} ${installButton}`;

        notificationService.showNonDisappearingNotification(NotificationType.INFO, `${messageTitle}\n${messageBody}`);
      });

      ipcRenderer.on('update_downloaded', () => {
        // tslint:disable-next-line max-line-length
        const installButton: string = `<a class="btn btn-default" style="color: #000000;" href="javascript:nodeRequire('electron').ipcRenderer.send('quit_and_install')">Install</a>`;
        const cancelButton: string = `<a class="btn btn-default" style="color: #000000;" href="#">Cancel</a>`;

        const messageTitle: string = '<h4>Update ready!</h4>';
        const messageBody: string = `${cancelButton} ${installButton}`;

        notificationService.showNonDisappearingNotification(NotificationType.INFO, `${messageTitle}\n${messageBody}`);
      });
    }
  });

}
