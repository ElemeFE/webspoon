#!/usr/bin/env node

import glob from 'glob';
import bfs from 'babel-fs';
import http from 'http';
import https from 'https';
import argollector from 'argollector';
import Capacitance from 'capacitance';

import compressor from '../lib/compressor';


/**
 * 通用声明
**/

var blockMatcher = /<!--\s*build\s([\s\S]+?)-->([\s\S]*?)<!--\s*endbuild\s*-->/g;
var tagMatcher = /<(?:script|link)([\s\S]*?)\/?>/ig;

class Attrs {
  toHTMLTag() {
    let obj = JSON.parse(JSON.stringify(this));
    let { file, href } = obj;
    delete obj.href;
    delete obj.file;
    const getAttrsString = () => Object.keys(obj).map(key => `${key}="${obj[key]}"`).join(' ');
    let result;
    switch(String(/\.[^.]*$/.exec(file)).toLowerCase()) {
      case '.js':
        obj.src = href;
        return `<script ${getAttrsString()}></script>`;
      case '.css':
        obj.href = href;
        obj.rel = obj.rel || 'stylesheet'; // 默认的 rel 属性使用 stylesheet
        return `<link ${getAttrsString()} />`;
      default:
        throw new Error('目前 <!-- build --> 块仅支持生成 js 和 css 文件');
    };
  }
  constructor(string) {
    for(let i, r = /([^= ]+)(?:="(.*?)")?/g; i = r.exec(string);) {
      let [ , key, value ] = i;
      if(value === void 0) value = key;
      this[key] = value;
    }
  }
};

var matchUsemin = string => {
  var attrs = new Attrs(string);
  attrs.href = attrs.href || attrs.src;
  delete attrs.src;
  if (attrs.file === void 0 && attrs.href) attrs.file = attrs.href.replace(/^\/(?!\/)/, '');
  if (/^\/\//.test(attrs.file)) attrs.file = 'http:' + attrs.file;
  return attrs;
};

var loadRemoteDataCache = {};
var loadRemoteData = url => {
  if (loadRemoteDataCache[url]) return loadRemoteDataCache[url];
  return loadRemoteDataCache[url] = new Promise((resolve, reject) => {
    (/^https/.test(url) ? https : http).get(url, res => {
      res.pipe(new Capacitance()).then(String).then(resolve, reject);
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
          var output = configs.toHTMLTag();
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
            let loader =/^https?:/.test(item.file) ? loadRemoteData(item.file) : bfs.readFile(item.file, 'utf8');
            if (configs.file.match(/\.js$/)) {
              loader = loader.then(data => {
                // 先不压缩，有个莫名其妙的 Bug @ 2016-01-28
                return data;
                // 压缩 js 里面的 css
                return /\.css$/.test(item.file) ? compressor.css(data) : data;
              }).then(data => {
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
              return compressor.js(list.join(';\n'));
            } else {
              return compressor.css(list.join('\n'));
            }
          }).then(result => {
            return bfs.writeFile(configs.file, result);
          }, error => {
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

