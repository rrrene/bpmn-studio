import {IShape} from '@process-engine/bpmn-elements_contracts';

import {IIndextab, ISection} from '../../../../../contracts';
import {BasicsSection} from './sections/basics/basics';
import {ProcessSection} from './sections/process/process';

export class Extensions implements IIndextab {
  public title: string = 'Extensions';
  public path: string = '/indextabs/extensions/extensions';
  public elementInPanel: IShape;
  public canHandleElement: boolean = true;
  public sections: Array<ISection>;

  private basicsSection: ISection = new BasicsSection();
  private processSection: ISection = new ProcessSection();

  constructor() {
    this.sections = [this.basicsSection, this.processSection];
  }

  public isSuitableForElement(element: IShape): boolean {
    if (!element) {
      return false;
    }

    this.sections.forEach((section: ISection) => {
      section.canHandleElement = section.isSuitableForElement(element);
    });

    return this.sections.some((section: ISection) => {
      return section.isSuitableForElement(element);
    });
  }
}
