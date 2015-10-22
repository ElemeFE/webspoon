#!/usr/bin/env node

import glob from 'glob';
import bfs from 'babel-fs';
import http from 'http';
import UglifyJS from 'uglify-js';


/**
 * 通用声明
**/

var matchUsemin = string => {
  var file = /file\s*=\s*"(.*?)"|$/.exec(string)[1];
  var href = /(?:href|src)\s*=\s*"(.*?)"|$/.exec(string)[1];
  if(file === void 0 && href) file = href.replace(/^\/(?!\/)/, '');
  if(/^\/\//.test(file)) file = 'http:' + file;
  return { file, href };
};

var loadRemoteData = url => {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      var buffers = [];
      res.on('data', data => buffers.push(data));
      res.on('end', () => resolve(Buffer.concat(buffers)));
      res.on('error', reject);
    });
  });
};


/**
 * 主过程
**/

// 从输入参数中读入数据
Promise.resolve(process.argv.slice(2)).then(args => {
  return Promise.all(args.map(value =>
    new Promise((resolve, reject) => {
      glob(value, (error, list) => error ? reject(error) : resolve(list));
    })
  )).then(list => {
    list = [].concat(...list);
    list.sort();
    return list;
  });
})

// 将 staticList 的文件重命名为带 hash 的
.then(list => {
  var tasks = [];
  return Promise.all(list.map(pathname => {
    // 此处不使用 Promise 扁平化是因为文件数据量可能很大，这样可以避免全部文件一起读入内存使内存占用过高
    return bfs.readFile(pathname).then(data => {
      data += '';
      data = data.replace(/<!--\s*build\s([\s\S]+?)-->([\s\S]*?)<!--\s*endbuild\s*-->/g, ($0, configs, content) => {
        configs = matchUsemin(configs);
        // 从 HTML 片段中搜索并读入引用的文件
        var list = [];
        var tagMatcher = /<(?:script|link)([\s\S]*?)>/ig;
        while(tagMatcher.exec(content)) {
          let item = matchUsemin(RegExp.$1);
          let loader =/^http:/.test(item.file) ? loadRemoteData(item.file) : bfs.readFile(item.file, 'utf8');
          loader = loader.then(data => {
            // 将 css 转换成 js，并和其他 JS 一起合并起来
            if(/\.css$/.test(item.file)) {
              data = `document.write(${JSON.stringify('<style>' + data + '</style>')});`;
            }
            // 为末尾不是 \n 的文件补上，否则 join 的时候可能因为上一个文件尾的单行注释而出问题
            return data.toString().replace(/[^\n]$/, '$&\n');
          });
          list.push(loader);
        }
        // 保存文件
        var task = Promise.all(list).then(list => {
          var result = UglifyJS.minify(list.join(''), { fromString: true });
          bfs.writeFile(configs.file, result.code);
        });
        // 保存任务并替换字符串
        tasks.push(task);
        return `<script src="${configs.href}"></script>`;
      });
      return bfs.writeFile(pathname, data);
    });
  })).then(() => Promise.all(tasks));
})

// 成功
.then(data => {
  // TODO
}) 

// 错误处理到 stderr
.catch(error => {
  process.stderr.write(error.stack + '\n');
  process.exit(1);
});
