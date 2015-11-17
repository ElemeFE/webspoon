#!/usr/bin/env node

import glob from 'glob';
import bfs from 'babel-fs';
import argollector from 'argollector';
import path from 'path';


const glop = (...args) => {
  return new Promise((resolve, reject) => {
    glob(...args, (error, list) => error ? reject(error) : resolve(list));
  });
};

const root = argollector['-root'] && argollector['-root'][0] || './';

// 创建正则，用于从 script/link 中取出各种属性
const re = new RegExp([
  '<(script|link)\\s',
  '(?=.*wildcard="(.*?)")', // require
  '(?=.*root="(.*?)"|)', // optional
  '(?=.*regexp="(.*?)"|)', // optional
  '(?=.*replacement="(.*?)"|)', // optional
  '.*?(?:>\s*</script>|>)'
].join(''), 'g');

const wildcard = data => {
  var taskList = [];
  for(let matches; matches = re.exec(data);) {
    let [ , type, wildcard, root, regexp, replacement ] = matches;
    taskList.push(glop(wildcard).then(list => list.map(src => {
      let href = path.resolve(src).replace(path.resolve(root || '.'), '');
      if(regexp) href = href.replace(new RegExp(regexp), replacement || '');
      switch(type) {
        case 'script':
          return `<script src="${href}" file="${src}"></script>`;
        case 'link':
          return `<link rel="stylesheet" href="${href}" file="${src}" />`;
      }
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
  // 读文件
  .then(list => Promise.all(list.map(path => {
    return bfs.readFile(path).then(data => ({ path, data: String(data) }));
  })))
  // 处理通配符
  .then(list => Promise.all(list.map(item => {
    return wildcard(item.data).then(data => {
      return bfs.writeFile(item.path, data);
    });
  })))
  // 捕获错误
  .catch(console.error);
