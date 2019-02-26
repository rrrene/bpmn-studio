import {IValidateIssue} from './IValidateIssue';

export interface IValidateResult {
  [key: string]: Array<IValidateIssue>;
}
