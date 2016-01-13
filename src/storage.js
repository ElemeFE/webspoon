import bfs from 'babel-fs';
import path from 'path';

// TODO: extract to npm
export default class Storage {
  constructor(projectName) {
    let dirname = path.join(process.env.HOME, '.' + projectName);
    this.dirname = bfs.mkdir(dirname).then(() => dirname, () => dirname);
  }
  getItem(name) {
    return this.dirname.then(dirname => bfs.readFile(path.join(dirname, name)).then(String));
  }
  setItem(name, data) {
    return this.dirname.then(dirname => bfs.writeFile(path.join(dirname, name), data));
  }
}
