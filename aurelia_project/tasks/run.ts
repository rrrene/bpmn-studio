/* eslint-disable import/no-mutable-exports */
import {CLIOptions} from 'aurelia-cli';
import * as browserSync from 'browser-sync';
import * as historyApiFallback from 'connect-history-api-fallback/lib';
import * as gulp from 'gulp';
import * as project from '../aurelia.json';
import build from './build';
import watch from './watch';

const serve: any = gulp.series(build, (done: Function) => {
  browserSync(
    {
      online: false,
      open: false,
      port: 9000,
      logLevel: 'silent',
      ghostMode: {
        clicks: false,
        scroll: false,
        location: false,
        forms: {
          submit: false,
          inputs: false,
          toggles: false,
        },
      },
      server: {
        baseDir: [project.platform.baseDir],
        middleware: [
          historyApiFallback(),
          (req: any, res: any, next: any): void => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            next();
          },
        ],
      },
    },
    (err: any, bs: any): void => {
      if (err) {
        done(err);
        return;
      }
      const urls: any = bs.options.get('urls').toJS();
      log(`Application Available At: ${urls.local}`);
      log(`BrowserSync Available At: ${urls.ui}`);
      done();
    },
  );
});

function log(message: any): void {
  console.log(message);
}

function reload(): void {
  log('Refreshing the browser');
  browserSync.reload();
}

let run: any;

if (CLIOptions.hasFlag('watch')) {
  run = gulp.series(serve, (done: any) => {
    watch(reload);
    done();
  });
} else {
  run = serve;
}

export default run;
