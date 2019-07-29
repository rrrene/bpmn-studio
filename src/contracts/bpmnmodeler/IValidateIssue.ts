import {IValidateIssueCategory} from './IValidateIssueCategory';

export interface IValidateIssue {
  category: IValidateIssueCategory;
  id: string;
  message: string;
}
