#!/usr/bin/env node

import bfs from 'babel-fs';
import path from 'path';
import glob from 'glob';
import crypto from 'crypto';
import childProcess from 'child_process';


/**
 * 声明
**/

var watchingSet = new Set();

var getHash = file => bfs.readFile(file).then(data => {
  let sha1 = crypto.createHash('sha1');
  sha1.update(data);
  return sha1.digest('hex');
});

var Env = function(obj) {
  for(let key in obj) this[key] = obj[key];
};
Env.prototype = process.env;

var trigger = file => {
  var child = childProcess.exec(commandList.join('\n'), {
    env: new Env({ src: file })
  });
  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
};

var watchFile = file => {
  return getHash(file).then(hash => {
    bfs.watchFile(file, { interval: 500 }, () => {
      getHash(file).then(newHash => {
        // 只有内容变化的时候才会触发
        if(hash === newHash) return;
        trigger(file);
        hash = newHash;
      }, () => {}).catch(e => console.error(e.stack));
    });
  });
};

var watchDirectory = directory => {
  return bfs.readdir(directory).then(list => {
    list = new Set(list);
    return bfs.watchFile(directory, { interval: 500 }, () => {
      // 目录变化时将新增的文件加入 watch 列表
      bfs.readdir(directory).then(newList => {
        // 检测新增
        newList.forEach(name => {
          if(list.has(name)) return;
          var file = path.join(directory, name);
          trigger(file);
          watch(file);
        });
        // 检测删除
        newList = new Set(newList);
        list.forEach(name => {
          if(newList.has(name)) return;
          trigger(path.join(directory, name));
        });
        list = newList;
      }, () => {}).catch(e => console.error(e.stack));
    });
  });
};

var watch = file => {
  var hash;
  if(watchingSet.has(file)) return;
  watchingSet.add(file);
  bfs.stat(file).then(state => {
    switch(true) {
      case state.isFile():
        return watchFile(file);
      case state.isDirectory():
        return watchDirectory(file);
    };
  }).catch(e => console.error(e.stack));
};


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
.then(list => Promise.all(list.map(watch)))

// 错误处理
.catch(error => {
  console.error(error.stack);
});
