import {IPayloadEntry} from './index';

export interface ITokenEntry {
  entryNr: number;
  eventType: string;
  createdAt: Date;
  payload: Array<IPayloadEntry>;
}
