import cluster from 'cluster';
import os from 'os';
import path from 'path';

cluster.setupMaster({ exec: path.join(__dirname, './compressor.child.js') });

export default new class {
  constructor() {
    this.inc = 0;
    this.heap = {};
    this.pool = os.cpus().map(() => cluster.fork());
    this.pool.forEach(node => node.on('message', message => {
      if(message.status === 'OK') {
        this.heap[message.id].resolve(message.code);
      } else {
        this.heap[message.id].reject(message.errorMessage);
      }
    }));
  }
  compress(code, type, index = Math.random() * this.pool.length | 0) {
    return new Promise((resolve, reject) => {
      var id = ++this.inc;
      this.heap[id] = { resolve, reject, code, type };
      this.pool[index].send({ id, code, type });
    });
  }
  js(code) {
    return this.compress(code, 'js');
  }
  css(code) {
    return this.compress(code, 'css');
  }
};
