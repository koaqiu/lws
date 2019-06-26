import { IncomingMessage, IncomingHttpHeaders } from "http";
import { Socket } from "net";
import { parse as parseUrl, UrlWithStringQuery, URL, URLSearchParams } from "url";

const splitBuffer = (buffer: Buffer, sp: string) => {
    const b = Buffer.from(sp);
    let index = -1;
    let off = 0;
    const result: Buffer[] = [];
    while ((index = buffer.indexOf(b, off)) != -1) {
        if (index == 0) {
            off += b.length;
            continue;
        }
        // const x = Buffer.alloc(index - off);
        // buffer.copy(x,0, off, index -off);
        const x = buffer.slice(off, index);
        result.push(x);
        // console.log(off, index, x.length, );
        off = index + b.length;
    }
    return result.length > 0 ? result : [buffer];
}
const mergeBodyData=(list:{name:string, data:any}[])=>{
    const r = [];
    list.forEach(item=>{
        const index = r.findIndex((ii)=>ii.name==item.name);
        if(index >=0){
            if(Array.isArray(r[index].data)){
                r[index].data.push(item.data);
            }else{
                r[index].data = [r[index].data, item.data];
            }
        }else{
            r.push(item);
        }
    });
    return r;
}
export default class ServerRequest {
    private _request: IncomingMessage;
    private _socket: Socket;
    private _data_str: string;
    private _data_buffer: Buffer;
    private _readDone: boolean;

    constructor(request: IncomingMessage) {
        this._request = request;
        this._socket = request.socket;

        this._data_str = '';

        this._readDone = false;
        request.on('data', (chunk) => {
            if (Buffer.isBuffer(chunk)) {
                const buffer = <Buffer>chunk;
                if (this._data_buffer == null) {
                    this._data_buffer = Buffer.from(buffer);
                } else {
                    this._data_buffer = Buffer.concat([this._data_buffer, buffer]);
                }
            } else {
                this._data_str += chunk;
            }
        });
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
    public get Data(): Buffer {
        return this._data_buffer;
    }
    public async getBase64Body() {
        const length = await this.getRequestLength();
        if (this.Data.includes('data:image/jpeg;base64,')) {
            const data = this.Data.slice('data:image/jpeg;base64,'.length).toString();
            return Buffer.from(data, 'base64');
        }
        return Buffer.from(this.Data.toString(), 'base64');
    }
    public getRequestLength() {
        if (!this._readDone) {
            return new Promise<number>((resolve, reject) => {
                this._request.on('end', () => {
                    this._readDone = true;
                    resolve(this.Data ? this.Data.length : 0);
                });
            });
        }
        return Promise.resolve<number>(this.Data ? this.Data.length : 0);
    }
    public get isMobile(): boolean {
        return this.Headers["user-agent"] && this.Headers["user-agent"].includes('Mobile');
    }
    private getHeader(key: string, defaultValue: string): string {
        const length = this._request.rawHeaders.length;
        for (let i = 0; i < length; i++) {
            const item = this._request.rawHeaders[i];
            if (item.toLowerCase() === key.toLowerCase() && i + 1 < length) {
                return this._request.rawHeaders[i + 1];
            }
        }
        return defaultValue;
    }
    public get ContentType(): string {
        return this.getHeader('Content-Type', '');
    }
    public get referer() {
        return this.getHeader('Referer', '');
    }
    public async getJsonBody(){
        await this.getRequestLength();
        return JSON.parse(this.Data.toString());
    }
    public async getFormData(): Promise<any[]> {
        const length = await this.getRequestLength();
        if (this.ContentType === 'application/x-www-form-urlencoded') {
            const search = new URLSearchParams(decodeURIComponent(this.Data.toString()));
            const r = [];
            search.forEach((value, name) => {
                r.push({
                    name,
                    data: value
                })
            })
            return mergeBodyData(r);
        }
        if (!this.ContentType.includes('multipart/form-data;')) {
            return [];
        }
        const boundary = this.ContentType.split('boundary=')[1];
        const fields = splitBuffer(this.Data, `--${boundary}`)
            .filter((line) => {
                return line.includes('Content-Disposition: form-data; ');
            })
            .map((line: Buffer) => {
                const l = line.length;
                let i = line.indexOf('name="');
                const data = {
                    name: '',
                    data: undefined
                };
                if (i > 0) {
                    let e = line.indexOf('"', i + 6);
                    if (e > 0) {
                        data.name = line.slice(i + 6, e).toString()
                        line = line.slice(e + 1);
                        // file
                        if (line.includes('filename="')) {
                            i = line.indexOf('filename="');
                            e = line.indexOf('"', i + 10);
                            data['fileName'] = line.slice(i + 10, e).toString();
                            line = line.slice(e + 3);
                            if (line.includes('Content-Type: ')) { //14
                                i = line.indexOf('Content-Type: ');
                                e = line.indexOf('\r\n', i + 14);
                                data['ContentType'] = line.slice(i + 14, e).toString();
                                line = line.slice(e + 4, line.length - 2);
                            }
                            data.data = line;
                        } else {
                            data.data = line.slice(4, line.length - 2).toString();
                        }
                    }
                }
                return data;
            });
        // console.log(fields);
        return mergeBodyData(fields);
    }
    public get connection() {
        return this._request.connection;
    }
    /**
     * 客户端Ip地址
     */
    public get remoteAddress() {
        const ip = this._request.headers['x-forwarded-for']
            || (this._request.connection && this._request.connection.remoteAddress)
            || (this._request.socket && this._request.socket.remoteAddress)
            || '';
        return (Array.isArray(ip) ? ip : ip.split(',')).pop();
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