## WebSpoon

这是一个 Web 前端工程化的工具包。


### 安装方式

```bash
npm install webspoon
```

或者也可以全局安装

```bash
sudo npm install webspoon -g
```


### 提供的工具

##### webspoon-usemin

用于合并 html 文件中特殊注释内的静态资源。

```bash
webspoon-usemin <FileList>
```

在 html 文件中可能有这样的注释块。

```html
<!-- build href="引用路径" file="文件路径" -->
<script src="引用路径" file="文件路径"></script>
<link rel="stylesheet" href="js文件路径" file="文件路径">
<!-- endbuild -->
```

在对这个 html 文件执行 webspoon-usemin 之后会将注释块内的文件打包成一个 js 文件（css 也会被转换成 js 以便统一管理），并保存到注释上写着的文件路径中。

注：
  1. 无论是读取文件还是写入文件，路径都相对于当前执行的工作目录。
  2. 替换完成后会覆盖原始文件，如果不希望被覆盖请先复制出来。

##### webspoon-rev

用于给静态资的文件名中加入 hash，同时替换引用文件的引用路径。

```bash
webspoon-rev -base <FileList> -static <FileList>
```

传入两个参数 -base 和 -static 它们后面需要跟上一个文件列表。

base 列表指定的是源文件，如果里面有对 static 列表中文件的引用就会被更新到带 hash 的版本。

static 列表指定的是静态文件，它会根据其自身内容重命名到带 hash 的版本。

注：
  1. base 中对静态资源的引用必须是从当前执行的工作目录到静态文件目录的完整相对路径。
  2. base 列表中的文件更新后会覆盖原始文件，如果不希望被覆盖请先复制出来。
  3. static 列表中的文件操作是被重命名而不是复制，如需备份请提前。


##### webspoon-watch

用于给静态资的文件名中加入 hash，同时替换引用文件的引用路径。

```bash
webspoon-watch -target <FileList> -exec <Command>
```

传入两个参数 -target 和 -exec。

target 参数用于指定需要监视的文件。

exec 参数用于指定监视到文件变化后需要执行的脚本。

在执行的脚本中可以通过 $src 变量来取到当前处理的文件路径（相对路径）。

注：
  1. 只有当文件内容有变化时才会触发。
  2. 通配符初始解析，这意味着开始 watch 之后才创建的文件不会被 watch 到。
