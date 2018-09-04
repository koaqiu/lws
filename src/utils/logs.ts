const styles = {
    'bold': ['\x1B[1m', '\x1B[22m'],
    'italic': ['\x1B[3m', '\x1B[23m'],
    'underline': ['\x1B[4m', '\x1B[24m'],
    'inverse': ['\x1B[7m', '\x1B[27m'],
    'strikethrough': ['\x1B[9m', '\x1B[29m'],
    'white': ['\x1B[37m', '\x1B[39m'],
    'grey': ['\x1B[90m', '\x1B[39m'],
    'black': ['\x1B[30m', '\x1B[39m'],
    'blue': ['\x1B[34m', '\x1B[39m'],
    'cyan': ['\x1B[36m', '\x1B[39m'],
    'green': ['\x1B[32m', '\x1B[39m'],
    'magenta': ['\x1B[35m', '\x1B[39m'],
    'red': ['\x1B[31m', '\x1B[39m'],
    'yellow': ['\x1B[33m', '\x1B[39m'],
    'whiteBG': ['\x1B[47m', '\x1B[49m'],
    'greyBG': ['\x1B[49;5;8m', '\x1B[49m'],
    'blackBG': ['\x1B[40m', '\x1B[49m'],
    'blueBG': ['\x1B[44m', '\x1B[49m'],
    'cyanBG': ['\x1B[46m', '\x1B[49m'],
    'greenBG': ['\x1B[42m', '\x1B[49m'],
    'magentaBG': ['\x1B[45m', '\x1B[49m'],
    'redBG': ['\x1B[41m', '\x1B[49m'],
    'yellowBG': ['\x1B[43m', '\x1B[49m']
};

/**
 * 设置控制台文本颜色
 * @param {string} color 
 * @param {*} text 
 */
export function setColor(color:string, text) {
    let a = styles[color];
    if (!a) return text;
    return `${a[0]}${text}${a[1]}`;
}

function fixNumber(n:number, length:number):string {
    let str = n.toString();
    if (str.length >= length) return str;
    let s = '';
    for (let i = 0; i < length - str.length; i++) {
        s += '0';
    }
    return s + str;
}
function getTime(date:Date, m = 0):string {
    switch (m) {
        case 1:
            return `${fixNumber(date.getHours(), 2)}:${fixNumber(date.getMinutes(), 2)}`;
        case 2:
            return `${fixNumber(date.getHours(), 2)}:${fixNumber(date.getMinutes(), 2)}:${fixNumber(date.getSeconds(), 2)}.${fixNumber(date.getMilliseconds(), 3)}`;
        default:
            return `${fixNumber(date.getHours(), 2)}:${fixNumber(date.getMinutes(), 2)}:${fixNumber(date.getSeconds(), 2)}`;
    }
}

export default class Log {
    static isDebug:boolean = false;
    static log(tag, msg, isErr) {
        let time = setColor('grey', getTime(new Date()));
        if (isErr) {
            console.error(`[${tag}] [${time}] ${msg}`);
        } else {
            console.log(`[${tag}] [${time}] ${msg}`);
        }
    }
    static info(msg) {
        Log.log(setColor('grey', '信息'), msg, false);
    }
    static warn(msg) {
        Log.log(setColor('yellow', '警告'), msg, false);
    }
    static test(msg) {
        if (Log.isDebug)
            Log.log(setColor('magenta', '测试'), msg, false);
    }
    static error(msg) {
        Log.log(setColor('red', '错误'), msg, true);
    }
}