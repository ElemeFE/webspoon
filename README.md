## WebSpoon

这是一个 Web 前端工程化的工具包。


#### webspoon-usemin

用于合并 html 文件中特殊注释内的静态资源。

```bash
webspoon-usemin <FileList>
```

在 html 文件中可能有这样的注释块。

```html
<!-- build 生成文件保存路径 -->
<script src="js文件路径"></script>
<link rel="stylesheet" href="js文件路径">
<!-- endbuild -->
```

在对这个 html 文件执行 webspoon-usemin 之后会将注释块内的文件打包成一个 js 文件（css 也会被转换成 js 以便统一管理），并保存到注释上写着的文件路径中。

注：
1: 无论是读取文件还是写入文件，路径都相对于当前执行的工作目录。
2: 替换完成后会覆盖原始文件，如果不希望被覆盖请先复制出来。



#### webspoon-rev

用于给静态资的文件名中加入 hash，同时替换引用文件的引用路径。

```bash
webspoon-rev -base <FileList> -static <FileList>
```

传入两个参数 -base 和 -static 它们后面需要跟上一个文件列表。

base 列表指定的是源文件，如果里面有对 static 列表中文件的引用就会被更新到带 hash 的版本。

static 列表指定的是静态文件，它会根据其自身内容重命名到带 hash 的版本。

注：
1: base 中对静态资源的引用必须是从当前执行的工作目录到静态文件目录的完整相对路径。
2: base 列表中的文件更新后会覆盖原始文件，如果不希望被覆盖请先复制出来。
3: static 列表中的文件操作是被重命名而不是复制，如需备份请提前。



