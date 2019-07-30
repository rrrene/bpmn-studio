import {inject} from 'aurelia-dependency-injection';
import {CLIOptions, Project, ProjectItem, UI} from 'aurelia-cli';

@inject(Project, CLIOptions, UI)
export default class AttributeGenerator {
  private project: Project;
  private options: CLIOptions;
  private ui: UI;

  constructor(project: Project, options: CLIOptions, ui: UI) {
    this.project = project;
    this.options = options;
    this.ui = ui;
  }

  public execute(): any {
    return this.ui
      .ensureAnswer(this.options.args[0], 'What would you like to call the custom attribute?')
      .then((name) => {
        const fileName = this.project.makeFileName(name);
        const className = this.project.makeClassName(name);

        this.project.attributes.add(ProjectItem.text(`${fileName}.ts`, this.generateSource(className)));

        return this.project.commitChanges().then(() => this.ui.log(`Created ${fileName}.`));
      });
  }

  public generateSource(className): string {
    return `import {autoinject} from 'aurelia-framework';

@autoinject()
export class ${className}CustomAttribute {
  constructor(private element: Element) { }

  valueChanged(newValue, oldValue) {

  }
}

`;
  }
}
