import {inject} from 'aurelia-dependency-injection';
import {CLIOptions, Project, ProjectItem, UI} from 'aurelia-cli';

import path from 'path';

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
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    return this.ui.ensureAnswer(this.options.args[0], 'What would you like to call the component?').then((name) => {
      return self.ui
        .ensureAnswer(
          this.options.args[1],
          "What sub-folder would you like to add it to?\nIf it doesn't exist it will be created for you.\n\nDefault folder is the source folder (src).",
          '.',
        )
        .then((subFolders) => {
          const fileName = this.project.makeFileName(name);
          const className = this.project.makeClassName(name);

          self.project.root.add(
            ProjectItem.text(path.join(subFolders, `${fileName}.ts`), this.generateJSSource(className)),
            ProjectItem.text(path.join(subFolders, `${fileName}.html`), this.generateHTMLSource(className)),
          );

          return this.project
            .commitChanges()
            .then(() =>
              this.ui.log(`Created ${name} in the '${path.join(self.project.root.name, subFolders)}' folder`),
            );
        });
    });
  }

  public generateJSSource(className): string {
    return `export class ${className} {    
  message: string;
  
  constructor() {
    this.message = 'Hello world';
  }
}`;
  }

  public generateHTMLSource(className): string {
    return `<template>
  <h1>\${message}</h1>
</template>`;
  }
}
