import {IBpmnXmlSaveOptions} from './IBpmnXmlSaveOptions';

export interface IBpmnModeler {
  _definitions: any;
  attachTo(dom: HTMLElement): void;
  clear(): void;
  detach(): void;
  destroy(): void;
  saveXML(options: IBpmnXmlSaveOptions, callback: (error: Error, result: string) => void): void;
  saveSVG(options: object, callback: (error: Error, result: string) => void): void;
  importXML(xml: string, errorHandler?: (err: Error) => void): void;
  get(object: string): any;
  on(event: string | Array<string>, callback: Function, priority?: number): void;
  off(event: string | Array<string>, callback: Function): void;
}
