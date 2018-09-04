import * as FileSystem from "fs";
import * as PATH from "path";

export default class Fs {
    /**
     * 返回文件扩展名（不带“.”）
     * @param pathName 
     */
    static getExtname(pathName):string {
        let ext = PATH.extname(pathName);
        return ext ? ext.slice(1) : 'unknown';
    }    
    static getFileInfo(file) {
        return new Promise((resolve, reject) => {
            FileSystem.stat(file, (err, stats) => {
                if (err) {
                    return reject(err);
                }
                return resolve(stats);
            });
        });
    }
    static getFiles(file:FileSystem.PathLike) {
        return new Promise<string[]>((resolve, reject) => {
            FileSystem.readdir(file, (err, files) => {
                if (err) {
                    return reject(err);
                }
                return resolve(files);
            });
        }).then(files => {
            return Promise.all(files.map(async (f) => {
                return {
                    FileName: f,
                    IsDirectory: Fs.isFolder(PATH.join(file.toString(), f)),
                    ... await Fs.getFileInfo(PATH.join(file.toString(), f))
                }
            }));
        });
    }
    static exists(file: FileSystem.PathLike):boolean{
        return FileSystem.existsSync(file);
    }
    static getStat(file: FileSystem.PathLike):FileSystem.Stats{
        return FileSystem.statSync(file);
    }
    static readJson(file:FileSystem.PathLike):any{
        try {
            return JSON.parse(FileSystem.readFileSync(file).toString());
            
        } catch (err) {
            return null;
        }
    }
    static write(file:FileSystem.PathLike, data:any){
        FileSystem.writeFileSync(file, data);
    }
    static isFolder(file: FileSystem.PathLike): boolean {
        if (!FileSystem.existsSync(file))
            return false;
        return FileSystem.statSync(file).isDirectory();
    }
    static isFile(file: FileSystem.PathLike): boolean {
        if (!FileSystem.existsSync(file))
            return false;
        return FileSystem.statSync(file).isFile();
    }
    /**
     * 合并路径
     * @param paths 
     */
    static combine(...paths:string[]):string{
        return PATH.join.apply(PATH, paths);
    }
}