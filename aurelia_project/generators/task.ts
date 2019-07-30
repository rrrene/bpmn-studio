import {inject} from 'aurelia-dependency-injection';
import {CLIOptions, Project, ProjectItem, UI} from 'aurelia-cli';

@inject(Project, CLIOptions, UI)
export default class TaskGenerator {
  private project: Project;
  private options: CLIOptions;
  private ui: UI;

  constructor(project: Project, options: CLIOptions, ui: UI) {
    this.project = project;
    this.options = options;
    this.ui = ui;
  }

  public execute(): any {
    return this.ui.ensureAnswer(this.options.args[0], 'What would you like to call the task?').then((name) => {
      const fileName = this.project.makeFileName(name);
      const functionName = this.project.makeFunctionName(name);

      this.project.tasks.add(ProjectItem.text(`${fileName}.ts`, this.generateSource(functionName)));

      return this.project.commitChanges().then(() => this.ui.log(`Created ${fileName}.`));
    });
  }

  public generateSource(functionName): any {
    return `import * as gulp from 'gulp';
import * as changed from 'gulp-changed';
import * as project from '../aurelia.json';

export default function ${functionName}() {
  return gulp.src(project.paths.???)
    .pipe(changed(project.paths.output, {extension: '.???'}))
    .pipe(gulp.dest(project.paths.output));
}

`;
  }
}
