export interface IDiagramValidator {
  isXML(): IDiagramValidator;
  isBPMN(): IDiagramValidator;
  throwIfError(): Promise<void>;
}
