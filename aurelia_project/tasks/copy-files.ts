/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
import * as gulp from 'gulp';
import * as changedInPlace from 'gulp-changed-in-place';
import * as minimatch from 'minimatch';
import * as path from 'path';
import * as project from '../aurelia.json';

export default function copyFiles(done: Function): void {
  if (typeof project.build.copyFiles !== 'object') {
    done();
    return;
  }

  const instruction: object = getNormalizedInstruction();
  const files: Array<string> = Object.keys(instruction);

  // eslint-disable-next-line consistent-return
  return gulp
    .src(files)
    .pipe(changedInPlace({firstPass: true}))
    .pipe(
      gulp.dest((x: any) => {
        const filePath: string = prepareFilePath(x.path);
        const key: any = files.find((f: any) => minimatch(filePath, f));
        return instruction[key];
      }),
    );
}

function getNormalizedInstruction(): object {
  const files: Array<string> = project.build.copyFiles;
  const normalizedInstruction: object = {};

  for (const key in files) {
    normalizedInstruction[path.posix.normalize(key)] = files[key];
  }

  return normalizedInstruction;
}

function prepareFilePath(filePath: string): string {
  let preparedPath: string = filePath.replace(process.cwd(), '').substring(1);

  // if we are running on windows we have to fix the path
  if (/^win/.test(process.platform)) {
    preparedPath = preparedPath.replace(/\\/g, '/');
  }

  return preparedPath;
}
