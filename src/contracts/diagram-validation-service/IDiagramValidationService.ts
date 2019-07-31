import {IDiagramValidator} from './index';

export interface IDiagramValidationService {
  /**
   * Starts the validation of a XML string.
   *
   * @param xml The XML to be validated.
   * @returns A fluent API to chain validations.
   */
  validate(xml: string): IDiagramValidator;
}
