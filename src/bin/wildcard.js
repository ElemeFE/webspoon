#!/usr/bin/env node

import bfs from 'babel-fs';
import argollector from 'argollector';
import capacitance from 'capacitance';
import path from 'path';

import globPromise from '../lib/globpromise';

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

const glop = (...args) => globPromise(...args).then(list => {
  sortFileList(list);
  return list;
});

const root = argollector['-root'] && argollector['-root'][0] || './';

// 创建正则，用于从 script/link 中取出各种属性
const re = new RegExp([
  '(\\s*)',
  '<(script|link)\\s',
  '(?=.*wildcard="(.*?)")', // require
  '(?=.*root="(.*?)"|)', // optional
  '(?=.*regexp="(.*?)"|)', // optional
  '(?=.*replacement="(.*?)"|)', // optional
  '.*?(?:>\s*</script>|>)'
].join(''), 'g');

const replaceWildcard = data => {
  var taskList = [];
  for(let matches; matches = re.exec(data);) {
    let [ , space, type, wildcard, root, regexp, replacement ] = matches;
    taskList.push(glop(wildcard).then(list => list.map(src => {
      let href = path.resolve(src).replace(path.resolve(root || '.'), '');
      if(regexp) href = href.replace(new RegExp(regexp), replacement || '');
      let isSameRoot = href === '/' + src;
      var result = [];
      switch(type) {
        case 'script':
          result.push(`${space}<script src="${href}"`);
          if(!isSameRoot) result.push(` file="${src}"`);
          result.push(`></script>`);
          break;
        case 'link':
          result.push(`${space}<link rel="stylesheet" href="${href}"`);
          if(!isSameRoot) result.push(` file="${src}"`);
          result.push(` />`);
          break;
      }
      return result.join('');
    })));
  }
  return Promise.all(taskList).then(list => {
    var i = 0;
    return data.replace(re, () => list[i++].join(''));
  });
};


/**
 * 主过程
**/
Promise
  // 组织参数，处理通配符
  .all(argollector.slice(0).concat(argollector['-files'] || []).map(wildcard => glop(wildcard)))
  .then(list => [].concat(...list))
  .then(list => {
    if(list.length) {
      // 对传入的文件执行 wildcard
      return Promise.all(list.map(path => {
        return bfs.readFile(path).then(data => ({ path, data: String(data) }));
      })).then(list => Promise.all(list.map(item => {
        return replaceWildcard(item.data).then(data => bfs.writeFile(item.path, data));
      })));
    } else {
      // 对 stdin 的数据执行 wildcard
      return process.stdin.pipe(new capacitance()).then(data => {
        return replaceWildcard(String(data)).then(data => {
          if(process.stdout.write(data)) return;
          process.stdout.on('drain', () => process.exit());
        });
      });
    }
  })
  // 捕获错误
  .catch(console.error);
