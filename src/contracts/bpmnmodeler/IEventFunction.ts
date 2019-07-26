export interface IEventFunction {
  /*
   * A Function thats been called when an event is called.
   *
   * @param event The event that called the function.
   */
  (event?: Event): void;
}
