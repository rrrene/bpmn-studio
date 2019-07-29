import {NavigationInstruction} from 'aurelia-router';

/**
 * This interface serves as a type when subscribing to the aurelia router events.
 */
export interface AureliaNavigationObject {
  result: NavigationResult;
  instruction: NavigationInstruction;
}

interface NavigationResult {
  completed: boolean;
  status: string;
}
