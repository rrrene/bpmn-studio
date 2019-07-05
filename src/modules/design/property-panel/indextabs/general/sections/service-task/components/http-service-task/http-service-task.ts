import {EventAggregator} from 'aurelia-event-aggregator';
import {bindable, inject, observable} from 'aurelia-framework';

import {IPropertiesElement, IProperty, IServiceTaskElement} from '@process-engine/bpmn-elements_contracts';

import {IBpmnModdle, IPageModel} from '../../../../../../../../../contracts';
import environment from '../../../../../../../../../environment';

interface IAuthParameters {
  headers: {
    'Content-Type'?: string,
    Authorization?: string,
  };
}
@inject(EventAggregator)
export class HttpServiceTask {

  @bindable() public model: IPageModel;
  public businessObjInPanel: IServiceTaskElement;
  public selectedHttpMethod: string;
  public selectedHttpUrl: string;
  public selectedHttpBody: string;
  public selectedHttpAuth: string;
  public selectedHttpContentType: string;

  private _eventAggregator: EventAggregator;
  private _moddle: IBpmnModdle;

  constructor(eventAggregator?: EventAggregator) {
    this._eventAggregator = eventAggregator;
  }

  public modelChanged(): void {
    this.businessObjInPanel = this.model.elementInPanel.businessObject;
    this._moddle = this.model.modeler.get('moddle');

    this._initHttpServiceTask();
  }

  public selectedHttpParamsChanged(): void {
    const noHttpBodySelected: boolean = this.selectedHttpBody === undefined;

    if (noHttpBodySelected) {
      this.selectedHttpAuth = undefined;
      this.selectedHttpContentType = undefined;
    }

    const noHttpUrlSelected: boolean = this.selectedHttpUrl === undefined;

    if (noHttpUrlSelected) {
      this.selectedHttpBody = undefined;
      this.selectedHttpAuth = undefined;
      this.selectedHttpContentType = undefined;
    }

    this._getProperty('params').value = this._getParamsFromInput();
    this._publishDiagramChange();
  }

  public httpMethodChanged(): void {
    const property: IProperty = this._getProperty('method');
    property.value = this.selectedHttpMethod;

    this._getParamsFromInput();
    this._publishDiagramChange();
  }

  private _createProperty(propertyName: string): void {
    const propertiesElement: IPropertiesElement = this._getPropertiesElement();

    const propertyObject: Object = {
      name: propertyName,
      value: '',
    };

    const property: IProperty = this._moddle.create('camunda:Property', propertyObject);

    propertiesElement.values.push(property);
  }

  private _getPropertiesElement(): IPropertiesElement {
    const propertiesElement: IPropertiesElement = this.businessObjInPanel.extensionElements.values.find((element: IPropertiesElement) => {
      return element.$type === 'camunda:Properties' && element.values !== undefined;
    });

    return propertiesElement;
  }

  private _getProperty(propertyName: string): IProperty {
    const propertiesElement: IPropertiesElement = this._getPropertiesElement();

    const property: IProperty = propertiesElement.values.find((element: IProperty) => {
      return element.name === propertyName;
    });

    return property;
  }

  private _initHttpServiceTask(): void {
    const methodPropertyExists: boolean = this._getProperty('method') !== undefined;
    const paramPropertyExists: boolean = this._getProperty('params') !== undefined;

    if (methodPropertyExists) {
      this.selectedHttpMethod = this._getProperty('method').value;
    } else {
      this._createProperty('method');
    }

    if (paramPropertyExists) {
      this._fillVariablesFromParam(this._getProperty('params').value);
    } else {
      this._createProperty('params');
    }
  }

  private _publishDiagramChange(): void {
    this._eventAggregator.publish(environment.events.diagramChange);
  }

  private _getParamsFromInput(): string {
    let params: string = '';

    params = params + '"' + this.selectedHttpUrl + '"';

    const httpBodySelected: boolean = this.selectedHttpBody !== undefined;

    if (httpBodySelected) {
      params = params + ', ' + this.selectedHttpBody + '';
    }

    let header: IAuthParameters;
    const httpContentTypeSelected: boolean = this.selectedHttpContentType !== undefined;
    const httpAuthorizationSelected: boolean = this.selectedHttpAuth !== undefined;
    const noHttpAuthorizationSelected: boolean = this.selectedHttpAuth === undefined;
    const noHttpContentTypeSelected: boolean = this.selectedHttpContentType === undefined;

    if (httpContentTypeSelected && noHttpAuthorizationSelected) {
      header = {
        headers: {
          'Content-Type': this.selectedHttpContentType,
        },
      };

      const stringifiedHeader: string = JSON.stringify(header);
      params = params + ', ' + stringifiedHeader;
    }

    if (httpAuthorizationSelected && noHttpContentTypeSelected) {
      header = {
        headers: {
          Authorization: this.selectedHttpAuth,
        },
      };

      const stringifiedHeader: string = JSON.stringify(header);

      params = params + ', ' + stringifiedHeader;
    }

    if (httpContentTypeSelected && httpAuthorizationSelected) {
      header = {
        headers: {
          Authorization: this.selectedHttpAuth,
          'Content-Type': this.selectedHttpContentType,
        },
      };

      const stringifiedHeader: string = JSON.stringify(header);

      params = params + ', ' + stringifiedHeader;
    }

    params = '[' + params + ']';

    return params;
  }

  private _fillVariablesFromParam(params: string): void {

    const regex: RegExp = new RegExp(',(?=[^\}]*(?:\{|$))');

    const splittedParamString: Array<string> = params.split(regex);

    const urlParamsGiven: boolean = splittedParamString.length > 0;
    if (urlParamsGiven) {
      const hasDoubleQuotationMarks: boolean = splittedParamString[0].search('"') > 0;
      const hasSingleQuotationMarks: boolean = splittedParamString[0].search('\'') > 0;

      let urlParam: string;
      if (hasDoubleQuotationMarks) {
        urlParam = splittedParamString[0].slice(splittedParamString[0].search('"') + 1, splittedParamString[0].lastIndexOf('"'));
      } else if (hasSingleQuotationMarks) {
        urlParam = splittedParamString[0].slice(splittedParamString[0].search('\'') + 1, splittedParamString[0].lastIndexOf('\''));
      }

      this.selectedHttpUrl = urlParam;
    }

    const bodyParamsGiven: boolean = splittedParamString.length > 1;
    if (bodyParamsGiven) {
      let bodyParam: string = splittedParamString[1].slice(1, splittedParamString[1].length);

      const bodyIsLastParameter: boolean = bodyParam.endsWith(']');
      if (bodyIsLastParameter) {
        bodyParam = bodyParam.substring(0, bodyParam.length - 1);
      }

      this.selectedHttpBody = bodyParam;
    }

    const headerParamsPosition: number = 2;
    const headerParamsGiven: boolean = splittedParamString.length > headerParamsPosition;
    if (headerParamsGiven) {

      let headerParam: string = splittedParamString[headerParamsPosition];
      const headerIsLastParameter: boolean = headerParam.endsWith(']');
      if (headerIsLastParameter) {
        headerParam = headerParam.substring(0, splittedParamString[headerParamsPosition].length - 1);
      }

      /**
       * This Regex replaces all single quotes with double quotes and adds double
       * quotes to non quotet keys.
       * This way we make sure that JSON.parse() can handle the given string.
       */
      const headerParamDoubleQuoted: string = headerParam.replace(/(\s*?{\s*?|\s*?,\s*?)(['"])?([a-zA-Z0-9]+)(['"])?:/g, '$1"$3":');

      const headerObject: IAuthParameters = JSON.parse(headerParamDoubleQuoted);

      this.selectedHttpContentType = headerObject.headers['Content-Type'];
      this.selectedHttpAuth = headerObject.headers['Authorization'];
    }
  }

}
