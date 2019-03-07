import {IValidateResult} from './IValidateResult';

export interface ILinting {
  activateLinting(): void;
  deactivateLinting(): void;
  lint(): IValidateResult;
  update(): void;
  clearIssues(): void;
  lintingActive(): boolean;
}
