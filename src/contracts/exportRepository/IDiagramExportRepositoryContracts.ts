export interface IDiagramExportRepositoryContracts {
  /**
   * Saves the current diagram from the given format to the disk.
   *
   * @param fileContent Content of the file, that should be saved.
   * @param outputName Name of the file, that should be created.
   * @param mimeType Mime type of the file, that should be created.
   */
  exportDiagram(fileContent: string, outputName: string, mimeType: string): void;
}
