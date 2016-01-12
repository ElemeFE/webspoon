#!/usr/bin/env node

import glob from 'glob';
import bfs from 'babel-fs';
import http from 'http';
import argollector from 'argollector';
import Capacitance from 'capacitance';

import compressor from './compressor';


/**
 * 通用声明
**/

var blockMatcher = /<!--\s*build\s([\s\S]+?)-->([\s\S]*?)<!--\s*endbuild\s*-->/g;
var tagMatcher = /<(?:script|link)([\s\S]*?)>/ig;

var matchUsemin = string => {
  var file = /file\s*=\s*"(.*?)"|$/.exec(string)[1];
  var href = /(?:href|src)\s*=\s*"(.*?)"|$/.exec(string)[1];
  if (file === void 0 && href) file = href.replace(/^\/(?!\/)/, '');
  if (/^\/\//.test(file)) file = 'http:' + file;
  return { file, href };
};

var loadRemoteDataCache = {};
var loadRemoteData = url => {
  if (loadRemoteDataCache[url]) return loadRemoteDataCache[url];
  return loadRemoteDataCache[url] = new Promise((resolve, reject) => {
    http.get(url, res => {
      res.pipe(new Capacitance()).then(resolve, reject);
    }).on('error', error => {
      var { code } = error;
      if (code === 'EHOSTUNREACH') code += ' (Can\'t connect to ' + error.address + ')';
      reject([
        code,
        '    at loadRemoteData("' + url + '")'
      ].join('\n'));
    });
  });
};


/**
 * 主过程
**/

// 从输入参数中读入数据
Promise

  // 组织参数，处理通配符
  .all(argollector.slice(0).concat(argollector['--files'] || []).map(
    fileName => new Promise((resolve, reject) => {
      glob(fileName, (error, list) => error ? reject(error) : resolve(list));
    })
  ))

  .then(list => {
    list = [].concat(...list);
    list.sort();
    return list;
  })

  // 打包 js 和 css 文件
  .then(list => {
    var tasks = [];
    var cache = {};
    return Promise.all(list.map(pathname => {
      // 此处不使用 Promise 扁平化是因为文件数据量可能很大，这样可以避免全部文件一起读入内存使内存占用过高
      return bfs.readFile(pathname).then(data => {
        data += '';
        data = data.replace(blockMatcher, ($0, configs, content) => {
          configs = matchUsemin(configs);
          if (!configs.file || !configs.href) {
            throw new Error('Missing essential attributes for <!-- build --> blocks:\n' + $0);
          }
          // 计算 output
          var output;
          if (/\.js$/.test(configs.file)) {
            output = `<script src="${configs.href}"></script>`;
          } else {
            output = `<link href="${configs.href}" rel="stylesheet" />`;
          }
          // 从 HTML 片段中搜索 href 和 filte
          var list = [];
          while (tagMatcher.exec(content)) list.push(matchUsemin(RegExp.$1));
          var resources = JSON.stringify(list.map(item => item.file));
          // 检测重复资源
          if(cache[configs.file]) {
            if(cache[configs.file].resources !== resources) {
              throw new Error([
                `The dist file ${configs.file} has conflict`,
                '',
                'A = ' + cache[configs.file].resources,
                'B = ' + resources
              ].join('\n'));
            }
            return cache[configs.file].output;
          }
          // 创建缓存
          cache[configs.file] = { resources, output };
          // 读入 list
          list.forEach((item, index) => {
            let loader =/^http:/.test(item.file) ? loadRemoteData(item.file) : bfs.readFile(item.file, 'utf8');
            if (configs.file.match(/\.js$/)) {
              loader = loader.then(data => {
                // 将 css 转换成 js，并和其他 JS 一起合并起来
                if (/\.css$/.test(item.file)) {
                  data = `document.write(${JSON.stringify('<style>' + data + '</style>')});`;
                } else if (!item.file.match(/\.js$/)) {
                  throw new Error('Not supported source file type: ' + item.file);
                }
                return data.toString();
              });
            } else if (configs.file.match(/\.css$/)) {
              if (item.file.match(/\.css$/)) {
                loader = loader.then(data => data.toString());
              } else {
                throw new Error('Not supported source file type: ' + item.file);
              }
            } else {
              throw new Error('Not supported target file type: ' + configs.file)
            }
            list[index] = loader;
          });
          // 保存文件
          var task = Promise.all(list).then(list => {
            if (/\.js$/.test(configs.file)) {
              return compressor.js(list.join('\n;'));
            } else {
              return compressor.css(list.join('\n'));
            }
          }).then(result => bfs.writeFile(configs.file, result), error => {
            if(typeof error === 'string') throw new Error(error);
            throw new Error([
              error.constructor.name + ': ',
              '    on error.message: ' + error.message,
              '    on pathname: ' + pathname,
              '    on configs.file: ' + configs.file
            ].join('\n'));
          });
          // 保存任务并替换字符串
          tasks.push(task);
          return output;
        });
        return bfs.writeFile(pathname, data);
      });
    })).then(() => Promise.all(tasks));
  })

  // 成功
  .then(data => {
    process.exit(0);
  })

  // 错误处理到 stderr
  .catch(error => {
    process.stderr.write('[31m\n' + error.stack + '\n[0m');
    process.exit(1);
  });

