import { IncomingMessage, IncomingHttpHeaders } from "http";
import { Socket } from "net";
import { parse as parseUrl, UrlWithStringQuery, URL } from "url";

export default class ServerRequest {
    private _request: IncomingMessage;
    private _socket: Socket;
    private _data;
    private _readDone: boolean;

    constructor(request: IncomingMessage) {
        this._request = request;
        this._socket = request.socket;

        this._data = '';
        this._readDone = false;
        request.on('data', (chunk) => { this._data += chunk; });
        request.on('end', () => { this._readDone = true; })
    }

    public get Headers(): IncomingHttpHeaders {
        return this._request.headers;
    }
    public get method(): string {
        return this._request.method;
    }
    public get url(): UrlWithStringQuery {
        return parseUrl(this._request.url);
    }
    public get statusCode(): number {
        return this._request.statusCode;
    }
    public get Data(): any {
        return this._data;
    }
    public async getBase64Body(){
        const length = await this.getRequestLength();
        if(this.Data.includes('data:image/jpeg;base64,')){
            const data = this.Data.substr('data:image/jpeg;base64,'.length);
            return Buffer.from(data, 'base64');
        }
        return Buffer.from(this.Data, 'base64');
    }
    public getRequestLength() {
        if(!this._readDone){
            return new Promise<number>((resolve, reject)=>{
                this._request.on('end', () => {
                    this._readDone = true;
                    resolve(this.Data.length);
                });
            });
        }
        return Promise.resolve<number>(this.Data.length);
    }
    public get isMobile(): boolean {
        return this.Headers["user-agent"] && this.Headers["user-agent"].includes('Mobile');
    }
    private getHeader(key:string, defaultValue:string):string{
        if (this._request.rawHeaders.includes(key)) {
            const index = this._request.rawHeaders.indexOf(key);
            if (index >= 0 && index + 1 < this._request.rawHeaders.length) {
                return this._request.rawHeaders[index + 1];
            }
        }
        return defaultValue;
    }
    public get ContentType():string{
        return this.getHeader('Content-Type', '');
    }
    public get referer() {
        return this.getHeader('Referer', '');
    }
    public getFormData():[]{
        //multipart/form-data; boundary=----WebKitFormBoundaryni3Zmn3hO59op4b2
        if(!this.ContentType.includes('multipart/form-data;')){
            return [];
        }
        const boundary = this.ContentType.split('boundary=')[1];
        const fields = this.Data.split(`--${boundary}`)
            .filter((line)=>{
                if(line.length < 10)
                    return false;
                return true;
            })
            .map((line)=>{
                const l = line.length;
                return line.substr(2, l-4);
            })
            .filter((line)=>{
                return line.indexOf('Content-Disposition: form-data; ') == 0;
            })
            .map((line:string)=>{
                const l = line.length;
                let i = line.indexOf('name="');
                const data = {
                    name:'',
                    data:''
                };
                if(i>0){
                    let e = line.indexOf('"', i + 6);
                    if(e>0){
                        data.name = line.substr(i+6, e-6-i);
                        line = line.substr(e+1);
                        // file
                        if(line.includes('filename="')){
                            i = line.indexOf('filename="');
                            e = line.indexOf('"', i + 10);
                            data['fileName'] = line.substr(i+10, e-10-i);
                            line = line.substr(e + 3);

                            if(line.includes('Content-Type: ')){ //14
                                i = line.indexOf('Content-Type: ');
                                e = line.indexOf('\r\n', i + 14);
                                data['ContentType'] = line.substr(i + 14, e-14-i);
                                line = line.substr(e + 4);
                            }
                            data.data = line;
                        }else{
                            data.data = line;
                        }
                    }
                }
                return data;
            });
        // console.log(fields);
        return fields;
    }
    /**
     * 远程（客户端）地址
     */
    public get remoteAddress() {
        return this._socket.remoteAddress;
    }
    public get remotePort() {
        return this._socket.remotePort;
    }
    public get remoteFamily() {
        return this._socket.remoteFamily;
    }
    /**
     * 本地（服务器）地址
     */
    public get localAddress() {
        return this._socket.localAddress;
    }
    public get localPort() {
        return this._socket.localPort;
    }
}