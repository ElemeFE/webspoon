#!/usr/bin/env node

import glob from 'glob';
import bfs from 'babel-fs';


/**
 * 通用声明
**/

var fixFilePath = pathname => pathname.replace(/^[/~]/, '');


/**
 * 主过程
**/

// 从输入参数中读入数据
Promise.resolve(process.argv.slice(2)).then(args => {
  return Promise.all(args.map(value =>
    new Promise((resolve, reject) => {
      glob(value, (error, list) => error ? reject(error) : resolve(list));
    })
  )).then(list => [].concat(...list));
})

// 将 staticList 的文件重命名为带 hash 的
.then(list => {
  var tasks = [];
  return Promise.all(list.map(pathname => {
    pathname = fixFilePath(pathname);
    // 此处不使用 Promise 扁平化是因为文件数据量可能很大，这样可以避免全部文件一起读入内存使内存占用过高
    return bfs.readFile(pathname).then(data => {
      data += '';
      data = data.replace(/<!--\s*build\s*(\S+)\s*-->([\s\S]*?)<!--\s*endbuild\s*-->/g, ($0, pathname, content) => {
        // 从 HTML 片段中搜索并读入引用的文件
        var list = [];
        var matcher = /<(script|link).*?(?:src|href)\s*=\s*(["'])(.*?)(\2)/ig;
        while(matcher.exec(content)) {
          list.push(Promise.all([RegExp.$1.toLowerCase(), bfs.readFile(fixFilePath(RegExp.$3))]));
        }
        var task = Promise.all(list)
        // 将 css 转换成 js，并和其他 JS 一起合并起来
        .then(list => list.map(([type, data]) => {
          if(type === 'script') return data;
          return `document.write(${JSON.stringify('<style>' + data + '</style>')});`;
        }).join(''))
        // 保存文件
        .then(result => bfs.writeFile(fixFilePath(pathname), result));
        // 保存任务并替换字符串
        tasks.push(task);
        return `<script src="${pathname}"></script>`;
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
