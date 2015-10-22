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
