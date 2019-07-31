import {IShape} from '@process-engine/bpmn-elements_contracts';

export interface IElementRegistry {
  /**
   * Register a tuple of (element, gfx, (secondaryGFX)).
   *
   * @param element element
   * @param gfx gfx
   * @param secondaryGfx Optional, other element to register, too.
   */
  add(element: IShape, gfx: SVGElement, secondaryGfx?: SVGElement): void;

  /**
   * Removes an element from the registry.
   *
   * @param element Element that should be removed.
   */
  remove(element: IShape): void;

  /**
   * Update the ID of an element.
   *
   * @param element Element to update.
   * @param newId New ID of the element
   */
  updateId(element: IShape, newId: string): void;

  /**
   * Return the model element for a given ID or graphics.
   *
   * elementRegistry.get('SomeElementId_1');
   * elementRegistry.get(gfx);
   *
   * @param filter Filter for selecting the element.
   */
  get(filter: string | SVGElement): IShape;

  /**
   * Returns all elements that match a given filter function.
   *
   * @param filterMethod Filter function to apply.
   * @return The Elements that matches the filter function.
   */
  filter(filterMethod: (element: IShape) => boolean): Array<IShape>;

  /**
   * Returns all rendered model elements.
   *
   * @returns An array with all Elements of the ElementRegistry.
   */
  getAll(): Array<IShape>;

  /**
   * Iterate over all diagram elements.
   *
   * @param fn Function that should be executed for every diagram element.
   */
  forEach(fn: Function): void;

  /**
   * Return the graphical representation of an element or its ID.
   *
   * @example
   * elementRegistry.getGraphics('SomeElementId_1');
   * elementRegistry.getGraphics(rootElement); // <g ...>
   *
   * elementRegistry.getGraphics(rootElement, true); // <svg ...>
   *
   *
   * @param filter ID or definition of the element.
   * @param secondary Whether to return the secondary connected element, or not.
   *
   * @return {SVGElement}
   */
  getGraphics(filter: string | IShape, secondary?: boolean): SVGElement;

  /**
   * Validate the suitability of the given ID; throws an exception
   * if there is a problem with the ID.
   *
   * @param id ID of the Element, that should be validated.
   * @throws Error if the ID is empty or already assigned.
   */
  _validateId(id: string): void;
}
