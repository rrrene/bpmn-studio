import {
  IDiagramValidationRule,
  IDiagramValidationRules,
  IDiagramValidationRuleSet,
  IDiagramValidator,
} from '../../contracts';

export class DiagramValidator implements IDiagramValidator {
  private _rules: IDiagramValidationRules;
  private _diagramXML: string;
  private _validations: Array<Promise<void>> = [];

  constructor(rules: IDiagramValidationRules, diagramXML: string) {
    this._rules = rules;
    this._diagramXML = diagramXML;
  }

  public isXML(): IDiagramValidator {
    this._processRuleSet(this._rules.isXML);

    return this;
  }

  public isBPMN(): IDiagramValidator {
    this._processRuleSet(this._rules.isBPMN);

    return this;
  }

  public async throwIfError(): Promise<void> {
    /*
     * We don't use `await Promise.all(this._validations);` here,
     * because we want to await the promises in order.
     *
     * Also .forEach is not possible because of await.
     */
    for (const validation of this._validations) {
      await validation;
    }
  }

  private _processRuleSet(ruleSet: IDiagramValidationRuleSet): void {
    const ruleSetPromise: Promise<void> = this._promiseForRuleSet(ruleSet);
    this._validations.push(ruleSetPromise);
  }

  private _promiseForRuleSet(ruleSet: IDiagramValidationRuleSet): Promise<void> {
    // Create an array with promises for all validation rules.
    const validationsResultPromise: Array<Promise<boolean>> = ruleSet.rules.map(
      (validationRule: IDiagramValidationRule): Promise<boolean> => {
        return validationRule(this._diagramXML);
      },
    );

    const unifiedPromise: Promise<Array<boolean>> = Promise.all(validationsResultPromise);

    // Create a single promise that will resolve when all validations succeed.
    // It will reject with the ruleset error, if one or more validation did not succeed.
    const ruleSetPromise: Promise<void> = unifiedPromise
      .then((validationResult: Array<boolean>): void => {
        const someValidationsFailed: boolean = validationResult.indexOf(false) !== -1;
        if (someValidationsFailed) {
          throw new Error(ruleSet.errorMessage);
        }
      })
      .catch((error: Error) => {
        throw new Error(`Error during validation: ${error.message}`);
      });

    return ruleSetPromise;
  }
}
