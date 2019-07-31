/* eslint-disable */
// Copyright (c) Brock Allen & Dominick Baier. All rights reserved.
// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

// tslint:disable:no-magic-numbers

export class UrlUtility {
  public static addQueryParam(url: string, name: string, value: string): string {
    if (url.indexOf('?') < 0) {
      url += '?';
    }

    if (url[url.length - 1] !== '?') {
      url += '&';
    }

    url += encodeURIComponent(name);
    url += '=';
    url += encodeURIComponent(value);

    return url;
  }

  public static parseUrlFragment(url: string, delimiter: string = '#'): any {
    if (typeof url !== 'string') {
      url = location.href;
    }

    const idx: number = url.lastIndexOf(delimiter);
    if (idx >= 0) {
      url = url.substr(idx + 1);
    }

    // tslint:disable-next-line:one-variable-per-declaration
    const params: any = {};
    const regex: RegExp = /([^&=]+)=([^&]*)/g;
    let m: any;

    let counter: number = 0;
    // tslint:disable-next-line:no-conditional-assignment
    while ((m = regex.exec(url))) {
      params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);

      if (counter++ > 50) {
        return {
          error: 'Response exceeded expected number of parameters',
        };
      }
    }

    return params;
  }
}
