import fs from 'fs';
import denodeify from 'denodeify';
import mkdirp from 'mkdirp';
import path from 'path';
const readFile = denodeify(fs.readFile);
const writeFile = denodeify(fs.writeFile);
const mkdirx = denodeify(mkdirp);

export default class Storage {
  constructor(dirname = '/tmp') {
    this.dirname = mkdirx(dirname).then(() => dirname, () => dirname);
  }
  get(name) {
    return this.dirname.then(dirname => readFile(path.join(dirname, name)).then(String));
  }
  set(name, data) {
    return this.dirname.then(dirname => writeFile(path.join(dirname, name), data));
  }
}
