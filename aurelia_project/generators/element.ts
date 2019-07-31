import {inject} from 'aurelia-dependency-injection';
import {CLIOptions, Project, ProjectItem, UI} from 'aurelia-cli';

@inject(Project, CLIOptions, UI)
export default class ElementGenerator {
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
      .ensureAnswer(this.options.args[0], 'What would you like to call the custom element?')
      .then((name) => {
        const fileName = this.project.makeFileName(name);
        const className = this.project.makeClassName(name);

        this.project.elements.add(
          ProjectItem.text(`${fileName}.ts`, this.generateJSSource(className)),
          ProjectItem.text(`${fileName}.html`, this.generateHTMLSource(className)),
        );

        return this.project.commitChanges().then(() => this.ui.log(`Created ${fileName}.`));
      });
  }

  public generateJSSource(className): string {
    return `import {bindable} from 'aurelia-framework';

export class ${className} {
  @bindable value;

  valueChanged(newValue, oldValue) {

  }
}

`;
  }

  public generateHTMLSource(className): string {
    return `<template>
  <h1>\${value}</h1>
</template>`;
  }
}
