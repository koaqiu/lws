
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