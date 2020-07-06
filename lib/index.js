
const { watch } = require('gulp')
const { parallel, series } = require('gulp')
const { src, dest } = require('gulp')


// 自动帮我们引入插件
const nodePlugins = require('gulp-load-plugins')
// 返回一个对象，所有的插件都会挂载到这个变量上
const plugins = nodePlugins()

// 开发服务器
const browserSync = require('browser-sync')
const bs = browserSync.create()

// 删除文件
const del = require('del')

// 模板文件所需要的数据
// cwd 返回命令行的当前工作目录
const cwd = process.cwd()

/**
 * 更改位置   一
 */
let confg = {
  // 默认配置
  build: {
    src: 'src',
    dist: 'dist',
    temp: 'temp',
    public: "public",
    paths: {
      styles: 'assets/styles/*.scss',
      scripts: 'assets/scripts/*.js',
      pages: '*.html',
      images: 'assets/images/**',
      fonts: 'assets/fonts/**'
    }
  }
}


try {
  const loadConfig = require(`${cwd}/zce.config.js`)
  confg = Object.assign({}, confg, loadConfig)
} catch (e) {
  const clean = () => {
    return del([confg.build.dist, confg.build.temp])
  }
}

// 处理样式文件
const style = () => {
  // { base: 'src' } 指定基准路径，保留src下面的目录结构
  return src(confg.build.paths.styles, { base: confg.build.src, cwd: confg.build.src })
    .pipe(plugins.sass({ outputStyle: 'expanded' }))
    .pipe(dest(confg.build.temp))
}

// 处理js文件
const script = () => {
  return src(confg.build.paths.scripts, { base: confg.build.src, cwd: confg.build.src })
    /**
     * 更改位置 2
     */
    .pipe(plugins.babel({ presets: [require('@babel/preset-env')] }))
    .pipe(dest(confg.build.temp))
}


// 处理html文件
const page = () => {
  return src(confg.build.paths.pages, { base: confg.build.src, cwd: confg.build.src })
    .pipe(plugins.swig({ data: confg.data, defaults: { cache: false } }))
    .pipe(dest(confg.build.temp))
}

// 处理图片与字体文件

const image = () => {
  return src(confg.build.paths.images, { base: confg.build.src, cwd: confg.build.src })
    .pipe(plugins.imagemin())
    .pipe(dest(confg.build.dist))
}

const font = () => {
  return src(confg.build.paths.fonts, { base: confg.build.src, cwd: confg.build.src })
    .pipe(plugins.imagemin())
    .pipe(dest(confg.build.dist))
}


// 其他文件及文件清除
const extra = () => {
  return src('**', { base: confg.build.public, cwd: confg.build.public })
    .pipe(dest(confg.build.dist))
}

// 清除dist目录
const clean = () => {
  return del([confg.build.dist, confg.build.temp])
}



// 修复html引入文件路径错误的问题
const useref = () => {
  return src(confg.build.paths.pages, { base: confg.build.temp, cwd: confg.build.temp })
    // 按照构建注释，查找引用文件合并并打包到指定目录中
    // 这里完成了文件的读取和写入
    // 可以在后添加其他操作，如压缩
    .pipe(plugins.useref({ searchPath: [confg.build.temp, '.'] }))
    // 压缩转换后的文件
    .pipe(plugins.if(/\.js$/, plugins.uglify()))
    .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
    .pipe(plugins.if(/\.html$/, plugins.htmlmin(
      {
        collapseWhitespace: true,
        miniftCSS: true,
        minifyJS: true
      }
    )))
    .pipe(dest(confg.build.dist))
}


// 启动服务器
// 执行流程：
// serve执行后，会创建监听任务，然后启动服务器
// 一旦监听部位发生变化，会执行对于操作
// 执行对应操作后，会重新编译文件，则这时候dist目录下的文件发生变化
// dist中的文件发生变化后，会被服务监听到，并帮我们刷新浏览器
const serve = () => {

  // 监听文件的变化，然后重新执行任务
  watch(confg.build.paths.styles, { cwd: confg.build.src }, style)
  watch(confg.build.paths.scripts, { cwd: confg.build.src }, script)
  watch(confg.build.paths.pages, { cwd: confg.build.src }, page)
  // 开发阶段不需要监听，否则浪费性能
  // watch('src/assets/images/**', image)
  // watch('src/assets/fonts/**', font)
  // watch('public/**', extra)

  // 这里和上面的区别是，没有发生构建，而是直接刷新浏览器
  // 服务其重新从监听的目录下读取文件
  watch([
    confg.build.paths.images,
    confg.build.paths.fonts
  ],{ cwd: confg.build.src }, bs.reload)

  watch('**', { cwd: confg.build.public }, bs.reload)

  bs.init({
    // 配置项
    notify: false,  // 在浏览器上是否显示操作提示
    port: 2080,   // 端口
    open: true, // 自动打开浏览器
    files: `${confg.build.temp}/**`,  // 监听的文件
    server: {
      // 网站根目录，
      // 查找流程如下，
      // 从左往右执行，先查找第一个，未找到再找其他位置
      baseDir: [confg.build.temp, confg.build.src, confg.build.public],
      // 指定一个路由，当遇到设置的路径时，就去指定的位置找
      // 比baseDir优先级更高
      routes: {
        '/node_modules': 'node_modules'
      }
    }
  })
}




// 开发时执行的任务
const compile = parallel(style, script, page)

// 上线之前执行的任务
const build = series(clean, parallel(series(compile, useref), image, font, extra))

// 开发阶段执行的任务
// 因为为了提高开发阶段时的构建效率，
// 图片字体可以不进行编译，而直接从源文件中查找
const develop = series(clean, compile, serve)

/**
 * 导出命令时，需要考虑那些导出哪些不导出
 */
module.exports = {
  clean,
  build,
  develop
}
