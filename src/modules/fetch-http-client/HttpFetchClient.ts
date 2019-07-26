import * as EssentialProjectErrors from '@essential-projects/errors_ts';
import { IHttpClient, IRequestOptions, IResponse } from '@essential-projects/http_contracts';

export class HttpFetchClient implements IHttpClient {
  private _httpSuccessResponseCode: number = 200;
  private _httpRedirectResponseCode: number = 300;

  public async get<T>(url: string, options?: IRequestOptions): Promise<IResponse<T>> {
    const request: Request = new Request(url, {
      method: 'GET',
      mode: 'cors',
      referrer: 'no-referrer',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const response: Response = await fetch(request);

    const parsedResponse: IResponse<T> = await this._evaluateResponse<T>(response);

    return parsedResponse;
  }

  public async post<D, T>(url: string, data: D, options?: IRequestOptions): Promise<IResponse<T>> {
    const request: Request = new Request(url, {
      method: 'POST',
      mode: 'cors',
      referrer: 'no-referrer',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data)
    });

    const response: Response = await fetch(request);

    const parsedResponse: IResponse<T> = await this._evaluateResponse<T>(response);

    return parsedResponse;
  }

  public async put<T>(url: string, data: T, options?: IRequestOptions): Promise<IResponse<T>> {
    const request: Request = new Request(url, {
      method: 'PUT',
      mode: 'cors',
      referrer: 'no-referrer',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data)
    });

    const response: Response = await fetch(request);

    const parsedResponse: IResponse<T> = await this._evaluateResponse<T>(response);

    return parsedResponse;
  }

  public async delete<T>(url: string, options?: IRequestOptions): Promise<IResponse<T>> {
    const request: Request = new Request(url, {
      method: 'DELETE',
      mode: 'cors',
      referrer: 'no-referrer',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const response: Response = await fetch(request);

    const parsedResponse: IResponse<T> = await this._evaluateResponse<T>(response);

    return parsedResponse;
  }

  private async _evaluateResponse<T>(response: Response): Promise<IResponse<T>> {
    const responseBody: string = await response.text();

    const responseHasErrorCode: boolean = this._responseIsAnError(response.status);
    if (responseHasErrorCode) {
      // tslint:disable-next-line variable-name
      const ErrorTypeToThrow: typeof Error = this._getErrorForStatusCode(response.status);

      throw new ErrorTypeToThrow(responseBody);
    }

    const parsedResponse: IResponse<T> = {
      result: this._parseResponseBody(responseBody),
      status: response.status
    };

    return parsedResponse;
  }

  private _responseIsAnError(responseStatus: number): boolean {
    return responseStatus < this._httpSuccessResponseCode || responseStatus >= this._httpRedirectResponseCode;
  }

  private _getErrorForStatusCode(responseStatus: number): typeof Error {
    const errorName: string = EssentialProjectErrors.ErrorCodes[responseStatus];

    const isEssentialProjectsError: boolean = this._isEssentialProjectsError(errorName);
    if (isEssentialProjectsError) {
      return EssentialProjectErrors[errorName];
    }

    // return normal error, if there is no subtype for the given code.
    return Error;
  }

  private _isEssentialProjectsError(errorName: string): boolean {
    return errorName in EssentialProjectErrors;
  }

  private _parseResponseBody(result: any): any {
    // NOTE: For whatever reason, every response.body received by popsicle is a string,
    // even in a response header "Content-Type application/json" is set, or if the response body does not exist.
    // To get around this, we have to cast the result manually.
    try {
      return JSON.parse(result);
    } catch (error) {
      return result;
    }
  }
}
