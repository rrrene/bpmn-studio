import {IShape} from '@process-engine/bpmn-elements_contracts';

export interface IModeling {
  updateProperties(element: IShape, properties: object): void;
  updateLabel(element: IShape, name: string): void;
  setColor(
    elements: Array<IShape> | IShape,
    options: {
      fill: string;
      stroke: string;
    },
  ): void;
}
