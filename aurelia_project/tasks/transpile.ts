import {CLIOptions, build} from 'aurelia-cli';
import * as eventStream from 'event-stream';
import * as gulp from 'gulp';
import * as changedInPlace from 'gulp-changed-in-place';
import * as notify from 'gulp-notify';
import * as plumber from 'gulp-plumber';
import * as rename from 'gulp-rename';
import * as sourcemaps from 'gulp-sourcemaps';
import * as ts from 'gulp-typescript';
import * as typescript from 'typescript';
import * as project from '../aurelia.json';

function configureEnvironment(): void {
  const env: string = CLIOptions.getEnvironment();

  return gulp
    .src(`aurelia_project/environments/${env}.ts`)
    .pipe(changedInPlace({firstPass: true}))
    .pipe(rename('environment.ts'))
    .pipe(gulp.dest(project.paths.root));
}

let typescriptCompiler: any = typescriptCompiler || null;

function buildTypeScript(): void {
  typescriptCompiler = ts.createProject('tsconfig.json', {
    typescript: typescript,
  });

  const dts: any = gulp.src(project.transpiler.dtsSource);

  const src: any = gulp.src(project.transpiler.source).pipe(changedInPlace({firstPass: true}));

  return eventStream
    .merge(dts, src)
    .pipe(plumber({errorHandler: notify.onError('Error: <%= error.message %>')}))
    .pipe(sourcemaps.init())
    .pipe(typescriptCompiler())
    .pipe(sourcemaps.write({sourceRoot: 'src'}))
    .pipe(build.bundle());
}

export default gulp.series(configureEnvironment, buildTypeScript);
