import {IPayloadEntryValue} from './index';

export interface IPayloadEntry {
  name?: string;
  values: Array<IPayloadEntryValue>;
}
