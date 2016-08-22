import argollector from 'argollector';
import denodefiy from 'denodeify';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';

const PLATFORM = os.platform();

const PROC_NAME = process.argv[1].replace(/.*?(\w)(\w*)\.js$/, ($0, $1, $2) => {
  let name = $1.toUpperCase() + $2;
  if (PLATFORM === 'darwin') name = `[1m${name}[0m`;
  return name;
});

const log = message => {
  if (PLATFORM === 'darwin') {
    message = message.replace(/<.*?>/g, '[36m$&[0m');
    message = message.replace(/'.*?'/g, '[35m$&[0m');
  }
  console.log(`${PROC_NAME} ${message}`);
};

const _readFile = denodefiy(fs.readFile);
const _writeFile = denodefiy(fs.writeFile);
const _rename = denodefiy(fs.rename);
const _stat = denodefiy(fs.stat);

class FileInfo {
  static create(path) {
    return Promise.all([ _readFile(path), _stat(path) ]).then(([ buffer, stats ]) => new this(buffer, stats));
  }
  constructor(buffer, stats) {
    this.buffer = buffer;
    this.stats = stats;
  }
  toString() {
    let hash = crypto.createHash('md5').update(this.buffer).digest('hex').slice(0, 6);
    let { length } = this.buffer;
    let mode = this.stats.mode.toString(8);
    return `<${hash}-${length}-${mode}>`;
  }
}

export var readFile = path => {
  return FileInfo.create(path).then(info => {
    log(`readFile('${path}') results ${info}`);
    return info.buffer;
  });
};

export var writeFile = (path, buffer) => {
  buffer = new Buffer(buffer);
  return _writeFile(path, buffer).then(() => FileInfo.create(path)).then(info => {
    log(`writeFile('${path}', ${info})`);
  });
};

export var rename = (oldPath, newPath) => {
  return FileInfo.create(oldPath).then(oldInfo => {
    return _rename(oldPath, newPath).then(() => {
      return FileInfo.create(newPath).then(newInfo => {
        log(`rename('${oldPath}', '${newPath}') move ${oldInfo} to ${newInfo}`);
      });
    });
  });
};
