import * as http from "http";
import Log, { setColor } from "./utils/logs";
import WebBaseHandler from "./webBaseHandler";

type MethodTypes = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS';
export interface IHandler {
    priority: number;//优先级，如果成功匹配多个则只执行数字最大的
    key: string;//key，暂时没什么用处
    method: MethodTypes | MethodTypes[];
    regex: () => RegExp;//必须！正则表达式。匹配地址（类似路由功能）
    action: (ser: WebBaseHandler) => void;
}
interface IOption {
    port: number,
    debug: boolean,
    root: string,
    directoryBrowse: boolean,
    defaultDocuments: string[],
}
const defaultOptions: IOption = {
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
    private _options!: IOption;
    private _handler: IHandler[] = [];
    constructor(options: IOption) {
        this._options = {
            ...defaultOptions,
            ...options
        };
    }
    private handlerRequest(server: http.Server, req: http.IncomingMessage, res: http.ServerResponse) {
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
    public addHandler(handler: IHandler) {
        this._handler.push(handler);
        return this;
    }
    public start(cb: () => void) {
        const port = this._options.port;
        const wwwroot = this._options.root;
        const httpServer = http.createServer((req, res) => {
            this.handlerRequest(httpServer, req, res);
        });
        httpServer.on('clientError', (err, socket) => {
            this.onError(err, socket);
        });
        httpServer.listen(port, cb);
    }
} 