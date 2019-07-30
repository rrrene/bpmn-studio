/* eslint-disable */

// Copyright (c) Brock Allen & Dominick Baier. All rights reserved.
// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.
import {UrlUtility} from './open-id-url-utility';

const OidcScope: string = 'openid';

export class SigninResponse {
  public error: string;
  public error_description: string;
  public error_uri: string;
  public state: string;
  public id_token: string;
  public session_state: string;
  public access_token: string;
  public token_type: string;
  public scope: string;
  public profile: any;
  public expires_at: number;

  constructor(url: string) {
    const values: any = UrlUtility.parseUrlFragment(url, '#');

    this.error = values.error;
    this.error_description = values.error_description;
    this.error_uri = values.error_uri;

    this.state = values.state;
    this.id_token = values.id_token;
    this.session_state = values.session_state;
    this.access_token = values.access_token;
    this.token_type = values.token_type;
    this.scope = values.scope;
    this.profile = undefined; // will be set from ResponseValidator

    const expires_in: number = parseInt(values.expires_in);
    if (typeof expires_in === 'number' && expires_in > 0) {
      const nowInSeconds: number = Math.floor(Date.now() / 1000);

      this.expires_at = nowInSeconds + expires_in;
    }
  }

  public get expires_in(): number {
    if (this.expires_at === undefined) {
      return undefined;
    }

    const nowInSeconds: number = Math.floor(Date.now() / 1000);

    return this.expires_at - nowInSeconds;
  }

  public get expired(): boolean {
    const expires_in: number = this.expires_in;
    if (expires_in === undefined) {
      return undefined;
    }

    return expires_in <= 0;
  }

  public get scopes(): Array<string> {
    return (this.scope || '').split(' ');
  }

  public get isOpenIdConnect(): boolean {
    return this.scopes.indexOf(OidcScope) >= 0 || Boolean(this.id_token);
  }
}
