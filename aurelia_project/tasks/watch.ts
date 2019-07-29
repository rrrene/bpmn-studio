import {build} from 'aurelia-cli';
import * as debounce from 'debounce';
import * as gulp from 'gulp';
import * as gulpWatch from 'gulp-watch';
import * as minimatch from 'minimatch';
import * as project from '../aurelia.json';
import copyFiles from './copy-files';
import processCSS from './process-css';
import processMarkup from './process-markup';
import transpile from './transpile';

const debounceWaitTime: number = 100;
let isBuilding: boolean = false;
const pendingRefreshPaths: Array<any> = [];
const watches: object = {};
let watchCallback: () => void = (): void => {};

watches[project.transpiler.source] = {name: 'transpile', callback: transpile};
watches[project.markupProcessor.source] = {name: 'markup', callback: processMarkup};
watches[project.cssProcessor.source] = {name: 'CSS', callback: processCSS};
if (typeof project.build.copyFiles === 'object') {
  for (const src of Object.keys(project.build.copyFiles)) {
    watches[src] = {name: 'file copy', callback: copyFiles};
  }
}

const watch: (callback?: any) => void = (callback?: any): void => {
  watchCallback = callback || watchCallback;
  return gulpWatch(
    Object.keys(watches),
    {
      read: false, // performance optimization: do not read actual file contents
      verbose: true,
    },
    (vinyl: any) => {
      if (vinyl.path && vinyl.cwd && vinyl.path.startsWith(vinyl.cwd)) {
        const pathToAdd: string = vinyl.path.substr(vinyl.cwd.length + 1);
        log(`Watcher: Adding path ${pathToAdd} to pending build changes...`);
        pendingRefreshPaths.push(pathToAdd);
        refresh();
      }
    },
  );
};

const refresh: any = debounce(() => {
  if (isBuilding) {
    log('Watcher: A build is already in progress, deferring change detection...');
    return;
  }

  isBuilding = true;

  const paths: Array<any> = pendingRefreshPaths.splice(0);
  const refreshTasks: Array<any> = [];

  // Dynamically compose tasks
  for (const src of Object.keys(watches)) {
    if (paths.find((x: any) => minimatch(x, src))) {
      log(`Watcher: Adding ${watches[src].name} task to next build...`);
      refreshTasks.push(watches[src].callback);
    }
  }

  if (refreshTasks.length === 0) {
    log('Watcher: No relevant changes found, skipping next build.');
    isBuilding = false;
    return;
  }

  const toExecute: any = gulp.series(
    readProjectConfiguration,
    gulp.parallel(refreshTasks),
    writeBundles,
    (done: any) => {
      isBuilding = false;
      watchCallback();
      done();
      if (pendingRefreshPaths.length > 0) {
        log('Watcher: Found more pending changes after finishing build, triggering next one...');
        refresh();
      }
    },
  );

  toExecute();
}, debounceWaitTime);

function log(message: string): void {
  console.log(message);
}

function readProjectConfiguration(): void {
  return build.src(project);
}

function writeBundles(): void {
  return build.dest();
}

export default watch;
