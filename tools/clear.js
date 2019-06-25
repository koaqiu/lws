const fs = require('fs');
const PATH = require('path')
const workPath = PATH.basename(__dirname) === 'tools' ? PATH.dirname(__dirname) : __dirname;
const toClear = [PATH.join(workPath, 'bin')];

const clearFolder = (path, top=true) => {
    console.log(top?'清理：':'删除：', path)
    fs.readdirSync(path)
        .forEach(file => {
            const fullFileName = PATH.join(path, file);
            if (fs.statSync(fullFileName).isDirectory()) {
                clearFolder(fullFileName, false);
                fs.rmdirSync(fullFileName);
            } else {
                fs.unlinkSync(fullFileName);
            }
        })
}
console.log('Folder Clear 0.0.1')
toClear.forEach(path => {
    clearFolder(path)
});
