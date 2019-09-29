import * as FileSystem from "fs";
import * as URL from 'url';
import Log, { setColor } from "./utils/logs";
import Fs from "./utils/fileSystem";
import { getMimetype } from "./utils/mimeType";
import { IncomingMessage, ServerResponse, Server, OutgoingHttpHeaders } from "http";
import ServerRequest from "./utils/serverRequest";
import { formatSize } from "./utils/number";
import { IAuthorize, IHandler, IRequestHandler } from './types';

export default class WebBaseHandler implements IHandler {
    private server: Server;
    private request: ServerRequest;
    private response: ServerResponse;
    private options;
    private wwwRoot: string;
    private pathName: string;
    private filePath: string;
    private requestUri: URL.UrlWithStringQuery;
    private authorizations: IAuthorize[];

    public get Path(): string { return this.pathName; }
    public get Request() {
        return this.request;
    }

    constructor(server, req, res, options, authorizations?: IAuthorize[]) {
        this.server = server;
        this.request = req instanceof ServerRequest
            ? req
            : new ServerRequest(req);
        this.response = res;
        this.options = options;
        this.wwwRoot = options.root;

        this.requestUri = this.request.url;
        //对路径解码，防止中文乱码
        this.pathName = decodeURI(this.requestUri.pathname);
        //获取资源文件的绝对路径
        this.filePath = Fs.combine(this.wwwRoot, this.pathName);
        this.authorizations = authorizations || [];
    }

    /**
     * 检查地址是否存在，如果存在那么是文件还是目录
     * @returns {number} 0-不存在，1-文件，2-目录
     */
    private checkUrl() {
        // Log.test(`pathname = ${this.pathName}`);
        // Log.test(`filePath = ${this.filePath}`);

        if (!Fs.exists(this.filePath))
            return false;
        let st = Fs.getStat(this.filePath);
        return st.isFile() ? 1 : 2;
    }
    public ok() {
        if (this.request.ContentType.includes('json')) {
            return this.outputJson('OK');
        }
        this.logHttpRequest(200);
        return this.outputContent('OK');
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
    async logHttpRequest(code = 200) {
        Log.info(`${this.request.remoteAddress} ${setColor('yellow', this.request.method)} ${this.request.url.href} [${this.request.referer}] ${code == 200 ? `${setColor('green', code)}` : `${setColor('red', code)}`}`
            + ` [${formatSize(await this.request.getRequestLength())}]`
        );
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
    outputJson(data: any, headers?: OutgoingHttpHeaders) {
        this.logHttpRequest(200);
        if (headers) {
            if (!headers["content-type"]) {
                headers["content-type"] = "application/json";
            }
        } else {
            headers = { "content-type": "application/json" };
        }
        this.response.writeHead(200, headers);
        this.response.end(JSON.stringify(data));
        return this.response;
    }
    /**
     * 把静态文件直接输出
     * 会根据文件扩展名判断contentType
     * @param outputFilePath 
     */
    outputFile(outputFilePath: string = '', minetype = '') {
        if (outputFilePath == '') {
            outputFilePath = this.filePath;
        }
        const contentType = minetype ? minetype : getMimetype(Fs.getExtname(outputFilePath));
        const status = Fs.getStat(outputFilePath);
        if (this.request.Headers["if-modified-since"] === status.ctime.toUTCString()) {
            this.response.writeHead(304);
            this.response.end();
            return this.response;
        }

        let statusCode = 200;
        let statusMessage = 'OK';
        let start = 0
        let end = status.size; //可读流是包前包后
        const resHeads = {
            "Content-type": contentType,
            "Content-Length": status.size,
            'Last-Modified': status.ctime.toUTCString()
        };
        const range = /^bytes=(\d+)-(\d*)/ig.exec(this.request.Headers['range'] || '');
        if (range) {
            //分片
            // 拿到起始位置和结束为止
            start = /^\d+$/ig.test(range[1]) ? parseInt(range[1]) : start;
            end = /^\d+$/ig.test(range[2]) ? parseInt(range[2]) : end - 1;
            // 获取成功 并且文件总大小告诉客户端
            resHeads['Accept-Ranges'] = 'bytes';
            resHeads['Content-Range'] = `bytes ${start}-${end}/${status.size}`;
            //resHeads['Content-Length'] = end - start + 1;
            delete resHeads['Content-Length'];
            statusCode = 206;
            statusMessage = 'Partial Content';
        }
        const stream = Fs.createReadStream(outputFilePath, { start, end });
        //错误处理
        stream.on('error', () => {
            this.returnServerError();
        });
        this.response.writeHead(statusCode, statusMessage, resHeads);
        this.logHttpRequest(statusCode);
        //读取文件
        stream.pipe(this.response);
        return this.response;
    }

    /**
     * 输出目录
     * @returns {ServerResponse}
     */
    outputFolder() {
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

        const files = Fs.getFiles(this.filePath).sort((a, b) => {
            if (a.IsDirectory && b.IsDirectory) {
                return a.FileName < b.FileName ? -1 : 1;
            }
            if (!a.IsDirectory && !b.IsDirectory) {
                return a.FileName < b.FileName ? -1 : 1;
            }
            return a.IsDirectory ? -1 : 1;
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
        // console.log('referer=',this.request.referer);

        this.response.write(`<footer>${new Date()}</footer>`);
        this.response.write('</body></html>');
        this.response.end();
        this.logHttpRequest(200);
    }
    async handlerApi(handlers: IRequestHandler[]) {
        if (handlers.length < 1) return false;
        const method = this.request.method;
        let arr = handlers
            .filter(h => method === h.method &&
                (typeof h.regex === 'function' ? h.regex(this) : h.regex.test(this.pathName)))
            .sort((a, b) => a.priority > b.priority ? 1 : -1);
        handlers.map(item => typeof item.regex === 'function' ? false : item.regex.test(''));//重置
        if (arr.length < 1) {
            return false;
        }

        let h = arr[arr.length - 1];
        if ((typeof h.authorize === 'boolean' && h.authorize === true) || typeof h.authorize === 'function') {
            // 需要认证
            if (this.authorizations.length == 0) {
                // 没有认证器
                return await this.outputContent('401 no authorizations', 401);
            }
            // 认证
            const r = this.authorizations.some((item) => {
                const r = item.handler(this.request.BaseRequest, item.config);
                if (r.success === false) {
                    return false
                }
                if (typeof h.authorize === 'function') {
                    return h.authorize(this, r.data);
                }
                return true;
            })
            if (r === false) {
                return await this.outputContent('401', 401);
            }
        }
        this.logHttpRequest(200);
        try {
            return await h.action(this);
        } catch (err) {
            return await this.outputContent(err, 500);
        }
    }
    /**
     * 处理请求
     * @returns 
     */
    async process(key: number, handlers: IRequestHandler[]) {
        //if (key != privateNum) { throw new Error('非法调用！'); }
        //检查请求的是不是静态文件
        const fileStat = this.checkUrl();
        //API
        var r = await this.handlerApi(handlers);
        if (r !== false) {
            return r;
        }
        if (!fileStat) {
            //TODO:处理/favicon.ico
            return this.returnNotFound();
        }

        switch (fileStat) {
            case 1:
                return this.outputFile();
            case 2:
                return this.outputFolder(); // this.outputContent('<h1>403 Forbidden</h1>', 403);
        }

        return this.returnServerError();
    }
}