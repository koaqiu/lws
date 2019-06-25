import WebBaseHandler from "../webBaseHandler";
import Fs from "../utils/fileSystem";

export default class upload extends WebBaseHandler{
    public async doAction(){
        if(this.Request.method == 'POST'){
            const length = await this.Request.getRequestLength();
            const fromData = await this.Request.getFormData();
            const fileIndex = fromData.findIndex((item:any)=>{
                return item.fileName;
            });
            if(fileIndex != -1){
                const file:any = fromData[fileIndex];
                Fs.write(file.fileName, Buffer.from(file.data,'utf-8'));
            }
            return this.outputContent(this.Request.Data);
        }
        return this.outputContent('ok!');
    }
}