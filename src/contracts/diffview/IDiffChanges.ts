export interface IDiffChanges {
  /*
   * This contains all Elements that have been added between two diagrams.
   */
  _added: object;

  /*
   * This contains all Elements that have been changed between two diagrams.
   */
  _changed: object;

  /*
   * This contains all Elements thats layout has been changed between two diagrams.
   */
  _layoutChanged: object;

  /*
   * This contains all Elements that have been removed between two diagrams.
   */
  _removed: object;
}
