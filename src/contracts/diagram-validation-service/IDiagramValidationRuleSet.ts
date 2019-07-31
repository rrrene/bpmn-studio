import {IDiagramValidationRule} from './index';

export interface IDiagramValidationRuleSet {
  rules: Array<IDiagramValidationRule>;
  errorMessage: string;
}
