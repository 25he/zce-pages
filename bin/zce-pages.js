#! /usr/bin/env node



// process.argv 拿到当前工作目录下命令行中输入的参数
// console.log(process.argv);
// 添加参数之后，命令行此时为：
// --cwd 指定一个新的工作目录，（当前项目的工作目录） 
// --gulpfile 指定一个新的 gulpfile 文件路径 lib/index.js


process.argv.push('--cwd')
process.argv.push(process.cwd())
process.argv.push('--gulpfile')
process.argv.push(require.resolve('..'))

// console.log(process.argv);


// 载入包中的gulp/bin/gulp
// 他会自动找到 gulp.cli 并执行
require('gulp/bin/gulp')


