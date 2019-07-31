export interface IBpmnXmlSaveOptions {
  /**
   * Add the preamble to the outputted xml.
   *
   * If true, the preamble will be added to the xml, that the modeler
   * exports.
   * The preamble looks like this:
   * <?xml version="1.0" encoding="UTF-8"?>
   *
   * Default: false
   */
  preamble?: boolean;

  /**
   * Format the xml before saving.
   *
   * If true, the modeller will beautify the xml before exporting.
   *
   * Default: false
   */
  format?: boolean;
}
