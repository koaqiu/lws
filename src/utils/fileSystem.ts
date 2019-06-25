import * as FileSystem from "fs";
import * as PATH from "path";

export default class Fs {
    /**
     * 返回文件扩展名（不带“.”）
     * @param pathName 
     */
    static getExtname(pathName): string {
        let ext = PATH.extname(pathName);
        return ext ? ext.slice(1) : 'unknown';
    }
    static getFileInfo = (file) => FileSystem.statSync(file);

    static getFiles(path: string) {
        return FileSystem.readdirSync(path)
            .map(f => {
                const stat = FileSystem.statSync(PATH.join(path, f));
                return {
                    FileName: f,
                    IsDirectory: stat.isDirectory(),
                    ...stat,
                }
            })
    }
    static exists(file: FileSystem.PathLike): boolean {
        return FileSystem.existsSync(file);
    }
    static getStat(file: FileSystem.PathLike): FileSystem.Stats {
        return FileSystem.statSync(file);
    }
    static readJson(file: FileSystem.PathLike): any {
        try {
            return JSON.parse(FileSystem.readFileSync(file).toString());
        } catch (err) {
            return null;
        }
    }
    static write(file: FileSystem.PathLike, data: any) {
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
    static combine(...paths: string[]): string {
        return PATH.join.apply(PATH, paths);
    }
}