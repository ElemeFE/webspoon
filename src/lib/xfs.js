import argollector from 'argollector';
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

const promiseifySync = f => {
  return (...args) => new Promise((resolve, reject) => {
    try {
      resolve(f(...args));
    } catch (error) {
      reject(error);
    }
  });
};

// node 自带的异步文件操作没有锁，直接使用会出问题
// 除非自己实现锁，否则不要使用异步文件操作
const _readFile = promiseifySync(fs.readFileSync);
const _writeFile = promiseifySync(fs.writeFileSync);
const _rename = promiseifySync(fs.renameSync);
const _stat = promiseifySync(fs.statSync);

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
