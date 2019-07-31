import {build} from 'aurelia-cli';
import * as gulp from 'gulp';
import * as sass from 'gulp-sass';
import * as sourcemaps from 'gulp-sourcemaps';
import * as project from '../aurelia.json';

export default function processCSS(): void {
  return gulp
    .src(project.cssProcessor.source)
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(build.bundle());
}
