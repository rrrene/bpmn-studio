/**
 * e2e task
 *
 * You should have the server up and running before executing this task. e.g. run `au run`, otherwise the
 * protractor calls will fail.
 */
import {CLIOptions} from 'aurelia-cli';
import * as del from 'del';
import * as gulp from 'gulp';
import {protractor} from 'gulp-protractor';
import * as typescript from 'gulp-typescript';
import * as tsConfig from './../../tsconfig.json';
import * as project from './../aurelia.json';
import build from './build';
import run from './run';

function clean(): Promise<Array<string>> {
  return del(`${project.e2eTestRunner.dist}/*`);
}

function build_tests(): NodeJS.ReadWriteStream {
  const typescriptCompiler: typescript.Project = typescript.createProject(
    Object.assign({}, tsConfig.compilerOptions, {
      module: 'commonjs',
    }),
  );

  return gulp
    .src(project.e2eTestRunner.typingsSource.concat(project.e2eTestRunner.source))
    .pipe(typescriptCompiler())
    .pipe(gulp.dest(project.e2eTestRunner.dist));
}

function e2e(): NodeJS.ReadWriteStream {
  return gulp
    .src(`${project.e2eTestRunner.dist}/**/*.js`)
    .pipe(
      protractor({
        configFile: 'test/protractor.conf.js',
        args: ['--baseUrl', 'http://127.0.0.1:9000'],
      }),
    )
    .on('end', () => {
      process.exit();
    })
    .on('error', () => {
      process.exit();
    });
}

// tslint:disable-next-line:no-default-export
export default gulp.series(clean, build_tests, build, run, e2e);
