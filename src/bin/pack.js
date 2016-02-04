#!/usr/bin/env node

import glob from 'glob';
import bfs from 'babel-fs';
import argollector from 'argollector';

/**
 * 主过程
**/

var regexp = new RegExp(argollector['-regexp'] && argollector['-regexp'][0] || '^');
var replacement = argollector['-replacement'] && argollector['-replacement'][0] || '';
var moduleName = argollector['-moduleName'] && argollector['-moduleName'][0] || 'templates';

// 这坨代码我自己都觉得烂，然而有更好的写法么？
// 目的是对文件列表做一个排序，并且让同级的文件总是优先于目录
var sortFileList = list => {
  for(let i = 0; i < list.length; i++) list[i] = list[i].split(/\//g);
  list.sort((a, b) => {
    let length = Math.max(a.length, b.length);
    for(let i = 0; i < length; i++) {
      let fileFirst = !!a[i + 1] - !!b[i + 1];
      if(fileFirst) return fileFirst;
      let diff = (a[i] || '').localeCompare(b[i] || '');
      if(diff) return diff;
    }
  });
  for(let i = 0; i < list.length; i++) list[i] = list[i].join('/');
};

Promise
  // 组织参数，处理通配符
  .all(argollector.slice(0).concat(argollector['-files'] || []).map(
    fileName => new Promise((resolve, reject) => {
      glob(fileName, (error, list) => error ? reject(error) : resolve(list));
    })
  ))
  .then(list => [].concat(...list))
  // 读文件
  .then(list => {
    sortFileList(list);
    var result = {};
    return Promise.all(list.map(path => {
      var key = path.replace(regexp, replacement);
      return bfs.readFile(path).then(data => result[key] = data + '');
    })).then(() => result);
  })
  // 输出
  .then(data => {
    process.stdout.write(`
void function(moduleName, result) {
  switch(true) {
    // CommonJS
    case typeof module === 'object' && !!module.exports:
      module.exports = result;
      break;
    // AMD (Add a 'String' wrapper here to fuck webpack)
    case String(typeof define) === 'function' && !!define.amd:
      define(moduleName, function() { return result; });
      break;
    // Global
    default:
      /**/ try { /* Fuck IE8- */
      /**/   if(typeof execScript === 'object') execScript('var ' + moduleName);
      /**/ } catch(error) {}
      window[moduleName] = result;
  }
}(${JSON.stringify(moduleName)}, ${JSON.stringify(data, null, 2)});
    `.replace(/^\s*|\s*$/g, '') + '\n');
  });
