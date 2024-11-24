export function isObject(value:any) {
    return typeof value === 'object' && value !== null;
}

export function isFunction(value:any) {
    return typeof value === 'function';
}

export function isString(value) {
    return typeof value === 'string'
}

export * from './shapeFlags'
const hasOwnProperty = Object.prototype.hasOwnProperty; // 反柯里化放大方法
export const hasOwn = (val,key) => hasOwnProperty.call(val,key)


