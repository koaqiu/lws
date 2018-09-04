import * as FileSystem from "fs";
import * as URL from 'url';
import Log, { setColor } from "./utils/logs";
import Fs from "./utils/fileSystem";
import { getMimetype } from "./utils/mimeType";

export default class WebBaseHandler {
    private request;
    private response;
    private options;
    private wwwRoot:string;
    private pathName:string;
    private filePath:string;
    private requestUri:URL.UrlWithStringQuery;

    constructor(req, res, options) {
        this.request = req;
        this.response = res;
        this.options = options;
        this.wwwRoot = options.root;
    }
    /**
     * 检查地址是否存在，如果存在那么是文件还是目录
     * @param {URL} url
     * @returns {number} 0-不存在，1-文件，2-目录
     */
    checkUrl(url:URL.UrlWithStringQuery) {
        //对路径解码，防止中文乱码
        this.pathName = decodeURI(url.pathname);
        //获取资源文件的绝对路径
        this.filePath = Fs.combine(this.wwwRoot, this.pathName);

        Log.test(`pathname = ${this.pathName}`);
        Log.test(`filePath = ${this.filePath}`);

        if (!Fs.exists(this.filePath))
            return false;
        let st = Fs.getStat(this.filePath);
        return st.isFile() ? 1 : 2;
    }
    handlerApi() {
        // let html = '<h1>ERROR</h1>' + this.pathName;
        const API_HANDLE = global['API_HANDLE'];
        let arr = API_HANDLE.filter(h => h.regex.test(this.pathName)).sort((a,b)=> a.priority > b.priority ? 1:-1);
        API_HANDLE.map(item=> item.regex.test(''));//重置
        if (arr && arr.length > 0) {
            this.logHttpRequest(200);
            let h = arr.pop();
            return h.handler(this, h);
        }
        return null;
    }
    /**
     * 输出文本
     * @param content 
     * @param code 
     */
    outputContent(content = '', code = 200) {
        this.response.writeHead(code, {
            "content-type": "text/html"
        });
        this.response.end(content);
        return this.response;
    }
    /**
     * 输出404错误
     * @returns {Response}
     */
    returnNotFound() {
        this.logHttpRequest(404);
        return this.outputContent('<html><head><title>404</title></head><body><h1>404 - File Not Found.</h1></body></html>', 404);
    }
    returnServerError(message = '<h1>500 Server Error</h1>') {
        this.logHttpRequest(500);
        return this.outputContent(message, 500);
    }
    /**
     * 控制台输出日志
     * @param {number} [code=200] 
     */
    logHttpRequest(code = 200) {
        Log.info(`${setColor('yellow', this.request.method)} ${this.request.url} ${code == 200 ? `${setColor('green', code)}` : `${setColor('red', code)}`}`);
    }
    /**
     * 
     * @param {Request} request 
     */
    getRequestQuery(request) {
        let requestUrl = request.url;
        let requestUri = URL.parse(requestUrl);
        return new URL.URLSearchParams(requestUri.search);
    }
    /**
     * 输出JSON数据
     * "content-type": "application/json"
     * @param data 
     */
    outputJson(data) {
        this.logHttpRequest(200);
        this.response.writeHead(200, {
            "content-type": "application/json"
        });
        this.response.end(JSON.stringify(data));
        return this.response;
    }
    /**
     * 把静态文件直接输出
     * 会根据文件扩展名判断contentType
     * @param outputFilePath 
     */
    outputFile(outputFilePath = null) {
        if (outputFilePath == null) {
            outputFilePath = this.filePath;
        }
        const contentType = getMimetype(Fs.getExtname(outputFilePath));
        const stream = FileSystem.createReadStream(outputFilePath);
        //错误处理
        stream.on('error', () => {
            this.returnServerError();
        });
        this.response.writeHead(200, {
            "content-type": contentType
        });
        this.logHttpRequest(200);
        //读取文件
        stream.pipe(this.response);
        return this.response;
    }

    /**
     * 输出目录
     * @returns {Response}
     */
    async outputFolder() {
        //解决301重定向问题，如果pathname没以/结尾，并且没有扩展名
        const folder = this.pathName;
        if (!folder.endsWith('/')) {
            this.requestUri.pathname = folder + "/";
            const redirect = URL.format(this.requestUri); //"http://" + request.headers.host + pathName;
            this.logHttpRequest(301);
            this.response.writeHead(301, {
                location: redirect
            });
            this.response.end(`redirect to ${redirect}`);
            return this.response;
        };

        //处理默认文档
        if (!this.options.defaultDocuments.every((value) => {
            const defaultFile = Fs.combine(this.filePath, value);
            if (Fs.isFile(defaultFile)) {
                this.outputFile(defaultFile);
                return false;
            }
            return true;
        })) {
            return this.response;
        }

        //没有找到默认文档
        if (!this.options.directoryBrowse) {
            return this.outputContent('<h1>403 Forbidden</h1>', 403);
        }
        //显示当前目录下所有文件
        this.response.writeHead(200, {
            "content-type": "text/html"
        });
        this.response.write(`<html><head><meta charset = 'utf-8'/><title>${folder}</title></head>`);
        this.response.write(`<body><h1>${folder}</h1><div><ul>`);
        if (folder != "/") {
            this.response.write(`<li>&lt;dir&gt; <a href='${Fs.combine(folder, '..')}'>..</a></li>`);
        }

        const files = await Fs.getFiles(this.filePath)
            .then(files => {
                return files.sort((a, b) => {
                    if (a.IsDirectory && b.IsDirectory) {
                        return a.FileName < b.FileName ? -1 : 1;
                    }
                    if (!a.IsDirectory && !b.IsDirectory) {
                        return a.FileName < b.FileName ? -1 : 1;
                    }
                    return a.IsDirectory ? -1 : 1;
                });
            });
        if (files.length == 0) {
            this.response.write(`<li><b>EMPTY</b></li>`);
        }
        for (const file of files) {
            //await file.FileName;
            if (file.IsDirectory) {
                this.response.write(`<li>&lt;dir&gt; <a href='${file.FileName}'>${file.FileName}</a></li>`);
            } else {
                this.response.write(`<li><a href='${file.FileName}'>${file.FileName}</a></li>`);
            }
        }

        this.response.write('</ul></div>');
        this.response.write(`<footer>${new Date()}</footer>`);
        this.response.write('</body></html>');
        this.response.end();
        this.logHttpRequest(200);
    }
    /**
     * 处理请求
     * @returns 
     */
    process() {
        this.requestUri = URL.parse(this.request.url);
        //检查请求的是不是存在的静态文件
        const fileStat = this.checkUrl(this.requestUri);
        if (!fileStat) {
            //TODO:处理/favicon.ico
            const result = this.handlerApi();
            if(result)
                return result;
            else
                return this.returnNotFound();
        }

        switch (fileStat) {
            case 1:
                return this.outputFile();
            case 2:
                return this.outputFolder();
        }
        return this.returnServerError();
    }
}