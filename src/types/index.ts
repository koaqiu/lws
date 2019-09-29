import * as http from "http";
export type MethodTypes = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS';
export type IAuthorizeResult = {
    success: boolean;
    data: any;
}
type authorizeFunc = (ser: IHandler, data: any) => boolean;
type matchFunc = (ser: IHandler) => boolean;

// Authorization
export type AuthorizeHandler = (request: http.IncomingMessage, config: any) => IAuthorizeResult;
export interface IAuthorize {
    handler: AuthorizeHandler,
    config: any
}
export interface IMiddleware{
    process(req: http.IncomingMessage, res: http.ServerResponse, authorizations?: IAuthorize[], result?: any): any;
}
export interface IRequestHandler {
    priority: number;//优先级，如果成功匹配多个则只执行数字最大的
    key: string;//key，暂时没什么用处
    method: MethodTypes | MethodTypes[];
    authorize?: boolean | authorizeFunc;
    regex: RegExp | matchFunc;//必须！正则表达式。匹配地址（类似路由功能）
    action: (ser: IHandler) => void;
}
export interface IHandler{

}
// export interface IWebHanlder {
//     priority: number;
//     key: string;
//     regex: RegExp | matchFunc;
//     method?: string;
//     authorize?: boolean | authorizeFunc;
//     handler: (ser: WebBaseHanlder, options: any) => Promise<ServerResponse>;
// }
export interface IServiceOption {
    port: number;
    openUrl?: string;
    debug?: boolean;
    root?: string;
    directoryBrowse?: boolean;
    defaultDocuments?: string[];
}