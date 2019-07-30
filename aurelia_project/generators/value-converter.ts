import {inject} from 'aurelia-dependency-injection';
import {CLIOptions, Project, ProjectItem, UI} from 'aurelia-cli';

@inject(Project, CLIOptions, UI)
export default class ValueConverterGenerator {
  constructor(private project: Project, private options: CLIOptions, private ui: UI) {}

  execute() {
    return this.ui
      .ensureAnswer(this.options.args[0], 'What would you like to call the value converter?')
      .then((name) => {
        const fileName = this.project.makeFileName(name);
        const className = this.project.makeClassName(name);

        this.project.valueConverters.add(ProjectItem.text(`${fileName}.ts`, this.generateSource(className)));

        return this.project.commitChanges().then(() => this.ui.log(`Created ${fileName}.`));
      });
  }

  generateSource(className) {
    return `export class ${className}ValueConverter {
  toView(value) {

  }

  fromView(value) {

  }
}

`;
  }
}
