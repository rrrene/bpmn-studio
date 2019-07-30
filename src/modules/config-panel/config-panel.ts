import {EventAggregator} from 'aurelia-event-aggregator';
import {inject} from 'aurelia-framework';
import {Router} from 'aurelia-router';

import {IIdentity} from '@essential-projects/iam_contracts';

import {IAuthenticationService} from '../../contracts/authentication/IAuthenticationService';
import {AuthenticationStateEvent, ISolutionEntry, ISolutionService} from '../../contracts/index';

@inject(Router, 'SolutionService', 'AuthenticationService', EventAggregator)
export class ConfigPanel {
  public internalSolution: ISolutionEntry;
  public authority: string;
  public defaultAuthority: string;

  private router: Router;
  private solutionService: ISolutionService;
  private authenticationService: IAuthenticationService;
  private eventAggregator: EventAggregator;

  constructor(
    router: Router,
    solutionService: ISolutionService,
    authenticationService: IAuthenticationService,
    eventAggregator: EventAggregator,
  ) {
    this.router = router;
    this.solutionService = solutionService;
    this.authenticationService = authenticationService;
    this.eventAggregator = eventAggregator;
  }

  public async attached(): Promise<void> {
    const internalSolutionUri: string = window.localStorage.getItem('InternalProcessEngineRoute');

    this.internalSolution = this.solutionService.getSolutionEntryForUri(internalSolutionUri);
    this.authority = this.internalSolution.authority;
    this.defaultAuthority = await this.getAuthorityForInternalSolution();
  }

  public async updateSettings(): Promise<void> {
    const authorityDoesNotEndWithSlash: boolean = !this.authority.endsWith('/');
    if (authorityDoesNotEndWithSlash) {
      this.authority = `${this.authority}/`;
    }

    const userIsLoggedIn: boolean = await this.authenticationService.isLoggedIn(
      this.internalSolution.authority,
      this.internalSolution.identity,
    );

    if (userIsLoggedIn) {
      await this.authenticationService.logout(this.internalSolution.authority, this.internalSolution.identity);

      this.internalSolution.identity = this.createDummyIdentity();
      this.internalSolution.isLoggedIn = false;
      this.internalSolution.userName = undefined;

      this.internalSolution.service.openSolution(this.internalSolution.uri, this.internalSolution.identity);
      this.solutionService.persistSolutionsInLocalStorage();

      this.eventAggregator.publish(AuthenticationStateEvent.LOGOUT);
    }

    this.internalSolution.authority = this.authority;

    this.router.navigateBack();
  }

  public setDefaultAuthority(): void {
    this.authority = this.defaultAuthority;
  }

  public cancelUpdate(): void {
    this.router.navigateBack();
  }

  private async getAuthorityForInternalSolution(): Promise<string> {
    const request: Request = new Request(`${this.internalSolution.uri}/security/authority`, {
      method: 'GET',
      mode: 'cors',
      referrer: 'no-referrer',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });

    const response: Response = await fetch(request);
    const authority: string = (await response.json()).authority;

    return authority;
  }

  public get uriIsValid(): boolean {
    if (this.uriIsEmpty) {
      return true;
    }

    /**
     * This RegEx checks if the entered URI is valid or not.
     */
    const urlRegEx: RegExp = /^(?:http(s)?:\/\/)+[\w.-]?[\w\-._~:/?#[\]@!$&'()*+,;=.]+$/g;
    const uriIsValid: boolean = urlRegEx.test(this.authority);

    return uriIsValid;
  }

  public get uriIsEmpty(): boolean {
    const uriIsEmtpy: boolean = this.authority === undefined || this.authority.length === 0;

    return uriIsEmtpy;
  }

  private createDummyIdentity(): IIdentity {
    const accessToken: string = this.createDummyAccessToken();
    // TODO: Get the identity from the IdentityService of `@process-engine/iam`
    const identity: IIdentity = {
      token: accessToken,
      userId: '', // Provided by the IdentityService.
    };

    return identity;
  }

  private createDummyAccessToken(): string {
    const dummyAccessTokenString: string = 'dummy_token';
    const base64EncodedString: string = btoa(dummyAccessTokenString);

    return base64EncodedString;
  }
}
