import {inject} from 'aurelia-dependency-injection';
import {CLIOptions, Project, ProjectItem, UI} from 'aurelia-cli';

@inject(Project, CLIOptions, UI)
export default class GeneratorGenerator {
  private project: Project;
  private options: CLIOptions;
  private ui: UI;

  constructor(project: Project, options: CLIOptions, ui: UI) {
    this.project = project;
    this.options = options;
    this.ui = ui;
  }

  public execute(): any {
    return this.ui.ensureAnswer(this.options.args[0], 'What would you like to call the generator?').then((name) => {
      const fileName = this.project.makeFileName(name);
      const className = this.project.makeClassName(name);

      this.project.generators.add(ProjectItem.text(`${fileName}.ts`, this.generateSource(className)));

      return this.project.commitChanges().then(() => this.ui.log(`Created ${fileName}.`));
    });
  }

  public generateSource(className): any {
    return `import {autoinject} from 'aurelia-dependency-injection';
import {Project, ProjectItem, CLIOptions, UI} from 'aurelia-cli';

@autoinject()
export default class ${className}Generator {
  constructor(private project: Project, private options: CLIOptions, private ui: UI) { }

  execute() {
    return this.ui
      .ensureAnswer(this.options.args[0], 'What would you like to call the new item?')
      .then(name => {
        let fileName = this.project.makeFileName(name);
        let className = this.project.makeClassName(name);

        this.project.elements.add(
          ProjectItem.text(\`\${fileName}.js\`, this.generateSource(className))
        );

        return this.project.commitChanges()
          .then(() => this.ui.log(\`Created \${fileName}.\`));
      });
  }

  generateSource(className) {
return \`import {bindable} from 'aurelia-framework';

export class \${className} {
  @bindable value;

  valueChanged(newValue, oldValue) {

  }
}

\`
  }
}

`;
  }
}
