import {bindingMode} from 'aurelia-binding';
import {bindable} from 'aurelia-framework';
import * as hljs from 'highlight.js';
import 'highlightjs-line-numbers.js';

const highlightEngine: hljs = hljs as hljs;

export class BpmnXmlView {
  public codeElement: HTMLElement;
  @bindable() public xml: string;
  @bindable({defaultBindingMode: bindingMode.oneWay}) public newXML: string;
  public highlighted: boolean = false;

  public async attached(): Promise<void> {
    highlightEngine.configure({
      languages: ['xml'],
    });

    setTimeout(async () => {
      if (this.codeElement) {
        await this.highlight();
      }
    }, 0);
  }

  public async xmlChanged(): Promise<void> {
    this.highlighted = false;
    if (this.codeElement) {
      await this.highlight();
    }
  }

  public async highlight(): Promise<void> {
    this.newXML = this.xml;
    await highlightEngine.lineNumbersBlock(this.codeElement);
    await highlightEngine.highlightBlock(this.codeElement);

    setTimeout(() => {
      this.highlighted = true;
    }, 0);
  }
}
