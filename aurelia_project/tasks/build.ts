/* eslint-disable import/no-mutable-exports */
import {CLIOptions, build as buildCLI} from 'aurelia-cli';
import * as gulp from 'gulp';
import * as project from '../aurelia.json';
import copyFiles from './copy-files';
import processCSS from './process-css';
import processMarkup from './process-markup';
import transpile from './transpile';
import watch from './watch';

const build: any = gulp.series(
  readProjectConfiguration,
  gulp.parallel(transpile, processMarkup, processCSS, copyFiles),
  writeBundles,
);

let main: any;

if (CLIOptions.taskName() === 'build' && CLIOptions.hasFlag('watch')) {
  main = gulp.series(build, (done: Function) => {
    watch();
    done();
  });
} else {
  main = build;
}

function readProjectConfiguration(): any {
  return buildCLI.src(project);
}

function writeBundles(): any {
  return buildCLI.dest();
}

export {main as default};
