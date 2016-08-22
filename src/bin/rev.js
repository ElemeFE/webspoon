#!/usr/bin/env node

import crypto from 'crypto';
import argollector from 'argollector';
import globPromise from '../lib/globpromise';

import { readFile, writeFile, rename } from '../lib/xfs';


/**
 * 核心处理器
**/

const revProcessorRecursionCounter = Object.create(null);
const revProcessor = ([baseList, staticList]) =>
  // 计算出所有 staticList 中文件的 hash 版本名
  Promise.all(staticList.map(item => {
    // 如果是递归过来的，item 就会是一个对象，包含一个真实文件路径和之前的版本路径
    // 如果是 glob 出来的，那就是一个字符串，旧版本路径和真实文件路径一致
    var realFilePath, oldPath;
    if (typeof item === 'object') {
      realFilePath = item.realFilePath;
      oldPath = item.oldPath;
      // 只允许每个文件递归三次，防止循环依赖造成的死循环
      if (++revProcessorRecursionCounter[realFilePath] > 3) return null;
    } else {
      realFilePath = oldPath = item;
      revProcessorRecursionCounter[realFilePath] = 0;
    }
    // 此处不使用 Promise 扁平化是因为文件数据量可能很大，这样可以避免全部文件一起读入内存使内存占用过高
    return readFile(realFilePath).then(data => {
      var newPath;
      var sha1 = crypto.createHash('sha1');
      sha1.update(data);
      var hash = sha1.digest('hex').slice(0, 6);
      // 如果真实文件路径和旧版本路径是一样的就表示这个文件从未加过版本，所以创建一个新的版本号
      if (realFilePath === oldPath) {
        newPath = oldPath.replace(/(?=[^.]*$)/, `${hash}.`);
      }
      // 否则替换原来的版本号
      else {
        newPath = oldPath.replace(/.{6}(?=\.[^.]*$)/, hash);
      }
      // 将信息打包成对象，丢给下一个步骤处理
      return { realFilePath, oldPath, newPath };
    });
  }).filter(item => item))
  // 将 baseList 中对 staticList 的引用更新到重命名 hash 后的版本，并写回文件
  .then(infoList => {
    // 为 infoList 创建索引以便访问
    var infoListByRealPath = Object.create(null);
    var infoListByNewPath = Object.create(null);
    infoList.forEach(item => {
      infoListByRealPath[item.realFilePath] = item;
      infoListByNewPath[item.newPath] = item;
    });
    // 将 infoList 中的旧路径提前转换成正则对象以提高性能
    var replaces = infoList.map(({ oldPath, newPath }) => ({
      matcher: new RegExp('\\b' + oldPath.replace(/\./g, '\\.') + '\\b', 'g'),
      newPath
    }));
    // 将 baseList 中每个文件内容中包含 infoList 旧路径的东西替换成新的
    // 如果 baseList 中的文件本身本身被加过版本号而且又有了变化就先记录下来
    var selfChangeList = [];
    var tasks = baseList.map(pathname => {
      // 此处不使用 Promise 扁平化是因为文件数据量可能很大，这样可以避免全部文件一起读入内存使内存占用过高
      return readFile(pathname).then(data => {
        data += '';
        // data 是读取到的文件内容，遍历 infoList 做一堆替换操作
        var newData = replaces.reduce((base, { matcher, newPath }) => {
          return base.replace(matcher, newPath);
        }, data);
        // 无修改，不操作
        if (data === newData) return;
        // 如果 baseList 中的文件本身有被替换过版本号，那么就先记录下来
        var replaced = infoListByRealPath[pathname];
        if (replaced) selfChangeList.push({ realFilePath: pathname, oldPath: replaced.newPath });
        // 文件回写
        return writeFile(pathname, newData);
      });
    });
    return Promise.all(tasks).then(() => {
      // 如果 selfChangeList 有东西，则递归 revProcessor 去处理
      if (selfChangeList.length) return revProcessor([ baseList, selfChangeList ]);
      return [];
    }).then(list => {
      list.forEach(({ oldPath, newPath }) => infoListByNewPath[oldPath].newPath = newPath);
      return infoList.map(({ oldPath, newPath }) => ({ oldPath, newPath }));
    });
  });



/**
 * 主过程
**/

// 从输入参数中读入数据
Promise

  .all([
    Promise.all(argollector['-base'].map(globPromise)).then(list => [].concat(...list)),
    Promise.all(argollector['-static'].map(globPromise)).then(list => [].concat(...list))
  ])

  .then(revProcessor).then(list => {
    let tasks = list.map(({ oldPath, newPath }) => {
      return rename(oldPath, newPath).then(() => [oldPath, newPath]);
    });
    return Promise.all(tasks);
   })

  // 成功
  .then(() => {
    // TODO: OK
  })

  // 错误处理到 stderr
  .catch(error => {
    process.stderr.write(`\x1b[31m${error.stack}\x1b[0m\n`);
    process.exit(1);
  });
