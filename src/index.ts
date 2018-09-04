import * as FileSystem from "fs";
import * as PATH from "path";
import * as http from "http";
import { exec } from "child_process";
import Fs from "./utils/fileSystem";
import Log, { setColor } from "./utils/logs";
import WebBaseHandler from "./webBaseHandler";
import { isInt } from "./utils/number";
import upload from "./hanlder/upload";

const VERSION = [0, 2, 5];

function showHelp() {
    let me = __filename.split(PATH.sep).pop();
    console.log(`把当前目录（${me}所在目录：${__dirname}）当作“主目录”创建一个简单的静态服务器`);
    console.log(`用法：node ${me} [选项]`);
    console.log();
    console.log('版本：', VERSION.join('.'));
    console.log(`如果配置文件（${me}.json）有效则先读取配置文件然后用下面的参数覆盖配置文件。`);
    console.log('选项：');
    console.log(' -P, --port <PORT>', "\t 监听的端口号（大于1024）。默认：8080");
    console.log(' --root <dir>', "\t\t 指定wwwRoot目录");
    console.log(` --directoryBrowse <${setColor('green', 'yes')}|${setColor('red', 'no')}>`, `\t 是否浏览目录，默认：${setColor('green', 'yes')}`);
    console.log(' --openUrl <path>', "\t 默认打开的路径");
    console.log(' -D, --debug', "\t\t 测试模式，会有更多的输出");
    console.log(' -U, --update', "\t\t 在线更新");
    console.log(' -V, --version', "\t\t 显示版本");
    console.log(' -H, --help', "\t\t 显示帮助");
}
function createServer(options, API_HANDLE) {
    const port = options.port;
    const wwwroot = PATH.resolve(__dirname, options.root);
    if (!Fs.isFolder(wwwroot)) {
        Log.error(`${wwwroot} 无效`);
        process.exit(1);
        return 1;
    }
    options.root = wwwroot;
    if (!isInt(port)) {
        showHelp();
        process.exit(1);
        return 1;
    } else {
        if (port < 1024 || port > 65535) {
            Log.error("port must be > 1024 AND < 65535");
            process.exit(1);
            return 1;
        }
    }
    global["API_HANDLE"] = API_HANDLE.filter(item => {
        if ((item.regex instanceof RegExp) == false)
            return false;
        if (typeof item.handler != 'function')
            return false;
        return true;
    }).map(item => {
        if (isNaN(item.priority)) {
            item.priority = 0;
        }
        return item;
    });

    const httpServer = http.createServer((req, res) => {
        new WebBaseHandler(req, res, options).process(httpServer);
    });
    httpServer.on('clientError', (err, socket) => {
        Log.error(err);
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    });
    httpServer.on('error', (err, socket) => {
        Log.error(`CAN NOT listen at ${err.port}`);
    });
    //指定一个监听的接口
    httpServer.listen(port, function () {
        console.log(`RootDir: ${wwwroot}`);
        console.log(`app is running at port:${setColor('red', port)}`);
        let os = process.platform;
        let url = `http://localhost:${port}/${options.openUrl.replace(/^\/+/ig, '')}`;
        switch (os) {
            case 'darwin':
                exec(`open '${url}'`);
                break;
            case 'freebsd':
            case 'linux':
            case 'sunos':
                exec(`x-www-browser '${url}'`);
                break;
            case 'win32':
                exec(`start ${url}`);
                break;
            default:

                break;
        }
    });
}

interface IOption {
    port: number,
    help: boolean,
    version: boolean,
    update: boolean,
    openUrl?: string,
    debug: boolean,
    root: string,
    /**
     * 配置文件
     */
    config?: string,
    directoryBrowse: boolean,
    defaultDocuments: string[],
    args?: string[]
}
const defaultOptions: IOption = {
    port: 8080,
    help: false,
    version: false,
    update: false,
    openUrl: '',
    debug: false,
    root: __dirname,
    directoryBrowse: true,
    defaultDocuments: [
        'index.html',
        'index.htm',
        'default.html',
        'default.htm',
    ]
};
function handlerArgs(): IOption {
    let args = process.argv;
    let argsCount = args.length;
    if (argsCount < 3)
        return <IOption>{};//Object.assign({}, defaultOptions, {});
    args = args.slice(2);
    let options = {};
    while (args.filter((v) => {
        return v.startsWith('-')
    }).length > 0) {
        let count = args.length;
        args.every((v, index) => {
            if (v.startsWith('-')) {
                if (index + 1 < count) {
                    let vv = args[index + 1];
                    if (!vv.startsWith('-')) {
                        options[v] = vv;
                        args.splice(index, 2);
                    } else {
                        options[v] = true;
                        args.splice(index, 1);
                    }
                } else {
                    options[v] = true;
                    args.splice(index, 1);
                }
                return false;
            }
            return true;
        });
    }
    delete options['defaultDocuments'];
    for (let key in options) {
        let element = options[key];
        switch (key) {
            case '-P':
            case '--port':
                if (isNaN(element)) {
                    Log.warn(`端口（${setColor('cyan', element)}）输入不正确，使用默认端口：${setColor('green', defaultOptions.port)}`);
                } else {
                    options['port'] = parseInt(element);
                }
                break;
            case '-H':
            case '--help':
                options['help'] = element;
                break;
            case '-U':
            case '--update':
                options['update'] = true;
                break;
            case '--directoryBrowse':
                if (['yes', 'no'].indexOf(element.toLowerCase()) == -1) {
                    Log.error(`directoryBrowse 的值必须是 ：yes|no`);
                    process.exit(2);
                    break;
                }
                options['directoryBrowse'] = /^yes$/g.test(element);
                break;
            default:
                options[key.replace(/^-{1,}/, '')] = element;
                break;
        }
        delete options[key];
    }
    return <IOption>options;
}
function loadConfig(file = null) {
    let configFile = file;
    let config = {};
    if (file == null) {
        let me = __filename.split(PATH.sep).pop();
        configFile = PATH.join(__dirname, `${me}.json`);
    }
    Log.test(`加装配置文件：${configFile}`);
    if (Fs.isFile(configFile)) {
        config = Fs.readJson(configFile);
        if (config) {
            delete config['help'];
            delete config['update'];
            //delete config['debug'];
            delete config['version'];
            console.log(`加装配置文件：${configFile}`, setColor('green', '成功'));
        } else {
            Log.error(`配置文件（${configFile}）加载错误`);
            config = {};
        }
    }
    return config;
}
let options = handlerArgs();
Log.isDebug = options.debug;
options = Object.assign({}, defaultOptions, loadConfig(options.config), options);

if (options.help === true) {
    showHelp();
    Log.test(JSON.stringify(options));
    process.exit(0);
} else if (options.version == true) {
    console.log('版本：', VERSION.join('.'));
} else if (options.update === true) {
    //doUpdate();
} else {
    createServer(options, [{
        priority: 0,//优先级，如果成功匹配多个则只执行数字最大的
        key: 'action test',//key，暂时没什么用处
        regex: /upload\.action/ig,//必须！正则表达式。匹配地址（类似路由功能）
        //处理程序，必须！参数“ser”是上面的 “WebBaseHanlder”
        handler: (request, response, options) => { 
            return new upload(request, response, options);
        }
    }
    ]);
}
