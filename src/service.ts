import * as http from "http";
import Log, { setColor } from "./utils/logs";
import WebBaseHandler from "./webBaseHandler";
import { IAuthorize, IMiddleware, IServiceOption, IRequestHandler, MethodTypes } from './types';


const defaultOptions: IServiceOption = {
    port: 8080,
    debug: true,
    root: '',
    directoryBrowse: true,
    defaultDocuments: [
        'index.html',
        'index.htm',
        'default.html',
        'default.htm',
    ]
};
export class WebService {
    private _options!: IServiceOption;
    private authorizations: IAuthorize[] = [];
    private middlewares: IMiddleware[] = [];
    private _handler: IRequestHandler[] = [];
    constructor(options: IServiceOption) {
        this._options = {
            ...defaultOptions,
            ...options
        };
    }
    /**
     * 添加验证处理方法
     * @param {IAuthorize} handler 
     */
    public addAuthorize(handler: IAuthorize){
        this.authorizations.push(handler);
        return this;
    }
    public addMiddleware(handler: IMiddleware) {
        this.middlewares.push(handler);
        return this;
    }
    private handlerRequest(server: http.Server, req: http.IncomingMessage, res: http.ServerResponse) {
        //new WebBaseHanlder(privateNum, req, res, this.options, this.authorizations)
            //.process(privateNum, this.handlers);
        const ws = new WebBaseHandler(server, req, res, this._options);
        const handler = this._handler.filter(
            h =>
                (Array.isArray(h.method) ? h.method.includes(<MethodTypes>req.method) : h.method === req.method)
                && h.regex().test(ws.Path)
        )
            .sort((a, b) => a.priority > b.priority ? 1 : -1)
            .pop();
        if (handler) {
            return handler.action(ws);
        } else {
            return ws.process();
        }
    }
    private onError(err, socket) {
        Log.error(err);
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    }
    public addHandler(handler: IRequestHandler) {
        this._handler.push(handler);
        return this;
    }
    public start(cb: () => void) {
        const port = this._options.port;
        const wwwroot = this._options.root;
        const httpServer = http.createServer((req, res) => {
            if (this.middlewares.length > 0) {
                let result = null;
                for (let i = 0; i < this.middlewares.length; i++) {
                    const middleware = this.middlewares[i];
                    result = middleware.process(req, res, this.authorizations, result);
                    if (res.finished) return;
                    if (result === null) break;
                }
            }
            
            this.handlerRequest(httpServer, req, res);
        });
        httpServer.on('clientError', (err, socket) => {
            this.onError(err, socket);
        });
        httpServer.listen(port, cb);
    }
} 