// 这个文件会帮我打包 packages下的模块 最终输出js文件

// node dev.js (要打包的文件 -f 打包的格式) === process.argv.slice(2)
import minimist from "minimist"
import {resolve,dirname} from "path"
import {fileURLToPath} from "url"
import {createRequire} from "module"
import esbuild from "esbuild"

// node 中的命令行参数通过process.argv获取
const args = minimist(process.argv.slice(2));
// console.log(args); // { _: [ 'reactivity' ], f: 'esm' } node scripts/dev.js reactivity -f esm

/* esm使用commonjs的方式 */
const __filename = fileURLToPath(import.meta.url); // 获取文件的绝对路径 但是带file
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);
// console.log(__dirname,__filename,require);


const target = args._[0] || "reactivity"; // 默认打包reactivity
const format = args.f || "iife"; // 打包后的模块规范
// console.log(target, format);

// node中的esm模块没有__dirname
// 根据命令行提供的路径进行路径
const entry = resolve(__dirname,`../packages/${target}/src/index.ts`)
const pkg = require(resolve(__dirname,`../packages/${target}/package.json`))

// console.log(pkg);

esbuild.context({
    entryPoints:[entry], // 入口
    outfile:resolve(__dirname,`../packages/${target}/dist/${target}.js`), // 出口
    bundle:true, // 有互相依赖打包到一起
    platform:"browser",// 打包后给浏览器使用
    sourcemap:true, // 可以调试源代码
    format,//cjs esm iife
    globalName:format==="iife"?pkg.buildOptions?.name:'' // 如果是立即执行函数模式需要一个变量名不然都匿名了，通过拿pkg中的打包配置项设置的name获取，但不是都有，比如shared就没有

}).then((ctx)=>{
    console.log("打包完成");
    return ctx.watch();// 持续监控
}).catch((error) => {
    console.error("打包失败:", error);
});