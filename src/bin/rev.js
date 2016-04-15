#!/usr/bin/env node

import crypto from 'crypto';
import bfs from 'babel-fs';
import argollector from 'argollector';

import globPromise from '../lib/globpromise';

/**
 * 主过程
**/

// 从输入参数中读入数据
Promise

  .all([
    Promise.all(argollector['-base'].map(globPromise)).then(list => [].concat(...list)),
    Promise.all(argollector['-static'].map(globPromise)).then(list => [].concat(...list))
  ])

  // 将 staticList 的文件重命名为带 hash 的
  .then(([baseList, staticList]) => Promise.all([
    baseList,
    Promise.all(staticList.map(pathname => {
      // 此处不使用 Promise 扁平化是因为文件数据量可能很大，这样可以避免全部文件一起读入内存使内存占用过高
      return bfs.readFile(pathname).then(data => {
        var sha1 = crypto.createHash('sha1');
        sha1.update(data);
        var hash = sha1.digest('hex').slice(0, 6);
        var newPath = pathname.replace(/(?=[^.]*$)/, `${hash}.`);
        return bfs.rename(pathname, newPath).then(() => [pathname, newPath]);
      });
    }))
  ]))

  // 将 baseList 中对 staticList 的引用更新到重命名 hash 后的版本，并写回文件
  .then(([baseList, staticList]) => {
    // 将 staticList 转换成 map 以便使用
    var staticMap = {};
    staticList.forEach(([oldPath, newPath]) => staticMap[oldPath] = newPath);
    // 将 staticList 中的旧路径提前转换成正则对象以提高性能
    staticList.forEach(args => args[0] = new RegExp('\\b' + args[0].replace(/\./g, '\\.') + '\\b', 'g'));
    // 将 baseList 中每个文件内容中包含 staticList 旧路径的东西替换成新的
    baseList.map(pathname => {
      // 自己可能被改名了？尝试从 map 中取
      pathname = staticMap[pathname] || pathname;
      // 此处不使用 Promise 扁平化是因为文件数据量可能很大，这样可以避免全部文件一起读入内存使内存占用过高
      return bfs.readFile(pathname).then(data => {
        data += '';
        // data 是读取到的文件内容，遍历 staticList 做一堆替换操作
        var newData = staticList.reduce((base, [oldPath, newPath]) => base.replace(oldPath, newPath), data);
        // 无修改，不操作
        if (data === newData) return;
        // 文件回写
        return bfs.writeFile(pathname, newData);
      });
    });
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
