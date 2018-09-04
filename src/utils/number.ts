
/**
 * 判断是否是整形数值（或者可以转换成整形数值）
 * @param value 
 */
export function isInt(value: string | number | boolean | null | any): boolean {
    if (value === null || value === NaN || value === undefined)
        return false;
    const str = value.toString();
    return /^[\+\-]{0,1}\d+$/g.test(str);
}

export function ParseInt(value: string | number | boolean | null | any, defaultValue: number): number {
    if (!isInt(value))
        return defaultValue;
    return parseInt(value);
}

export function formatSize(length: number): string {
    if (length < 1024)
        return `${length} byte${length > 0 ? "s" : ""}`;
    if (length < 1048576) {
        let kbs = length / 1024;
        kbs = Math.round(kbs * 100) / 100
        return `${kbs} Kb`;
    }
    if (length < 1073741824) {
        let kbs = length / 1048576;
        kbs = Math.round(kbs * 100) / 100
        return `${kbs} Mb`;
    }
    let kbs = length / 1073741824;
    kbs = Math.round(kbs * 100) / 100
    return `${kbs} Gb`;
}

function fixNumber(n: number, length: number): string {
    let str = n.toString();
    if (str.length >= length) return str;
    let s = '';
    for (let i = 0; i < length - str.length; i++) {
        s += '0';
    }
    return s + str;
}