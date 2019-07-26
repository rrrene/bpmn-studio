import { IHttpClient, IRequestOptions, IResponse } from '@essential-projects/http_contracts';

export class HttpClientProxy implements IHttpClient {
  private _proxiedHttpClient: IHttpClient;
  private _urlPrefix: string;

  constructor(proxiedHttpClient: IHttpClient, urlPrefix: string) {
    this._proxiedHttpClient = proxiedHttpClient;
    this._urlPrefix = urlPrefix;
  }

  public setUrlPrefix(newUrlPrefix: string): void {
    this._urlPrefix = newUrlPrefix;
  }

  public get<T>(url: string, options?: IRequestOptions): Promise<IResponse<T>> {
    const prefixedUrl: string = `${this._urlPrefix}${url}`;

    return this._proxiedHttpClient.get(prefixedUrl, options);
  }

  public post<D, T>(url: string, data: D, options?: IRequestOptions): Promise<IResponse<T>> {
    const prefixedUrl: string = `${this._urlPrefix}${url}`;

    return this._proxiedHttpClient.post(prefixedUrl, data, options);
  }

  public put<T>(url: string, data: T, options?: IRequestOptions): Promise<IResponse<T>> {
    const prefixedUrl: string = `${this._urlPrefix}${url}`;

    return this._proxiedHttpClient.put(prefixedUrl, data, options);
  }

  public delete<T>(url: string, options?: IRequestOptions): Promise<IResponse<T>> {
    const prefixedUrl: string = `${this._urlPrefix}${url}`;

    return this._proxiedHttpClient.delete(prefixedUrl, options);
  }
}
