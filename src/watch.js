#!/usr/bin/env node

import bfs from 'babel-fs';
import glob from 'glob';
import crypto from 'crypto';
import childProcess from 'child_process';


/**
 * 声明
**/

var getHash = file => bfs.readFile(file).then(data => {
  let sha1 = crypto.createHash('sha1');
  sha1.update(data);
  return sha1.digest('hex');
});

var Env = function(obj) {
  for(let key in obj) this[key] = obj[key];
};
Env.prototype = process.env;


/**
 * 收集参数
**/

var watchingList = [];
var commandList = [];
process.argv.slice(2).reduce((base, item) => {
  switch(item) {
    case '-target': return watchingList;
    case '-exec': return commandList;
    default:
      if(!base) return base;
      base.push(item);
      return base;
  }
}, null);


/**
 * 主过程
**/

// 处理通配符
watchingList = Promise.all(
  watchingList.map(pattern => new Promise((resolve, reject) => {
    glob(pattern, (error, list) => {
      return error ? reject(error) : resolve(list);
    });
  }))
).then(list => [].concat(...list))

// watch 每一个文件
.then(list => Promise.all(list.map(file => {
  bfs.stat(file).then(state => {
    if(!state.isFile()) return;
    return getHash(file);
  }).then(hash => {
    // 如果不是文件则什么也不做
    if(!hash) return;
    bfs.watchFile(file, { interval: 500 }, () => {
      getHash(file).then(newHash => {
        // 只有内容变化的时候才会触发
        if(hash === newHash) return;
        var child = childProcess.exec(commandList.join('\n'), {
          env: new Env({ src: file })
        });
        child.stdout.pipe(process.stdout);
        child.stderr.pipe(process.stderr);
        hash = newHash;
      });
    });
  });
})))

// 错误处理
.catch(error => {
  console.error(error);
});
