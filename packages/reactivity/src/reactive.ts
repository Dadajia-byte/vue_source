import { isObject } from "@vue/shared";
import { ReactiveFlags,mutableHandlers } from "./baseHandler";

// 用于记录我们的 代理后的结果可以复用
const reactiveMap = new WeakMap();

function createReactiveObject(target){
    // 统一做判断，响应式对象必须是对象才行
    if(isObject(target)) {
        return target;
    }
    if(target[ReactiveFlags.IS_REACTIVE]) { // 保证无法被重复代理
        return target;
    }
    // 取缓存，如果有直接返回
    const existProxy = reactiveMap.get(target)
    if(existProxy) {
        return existProxy
    }
    let proxy = new Proxy(target,mutableHandlers);
    // 根据对象缓存代理后的结果
    reactiveMap.set(target,proxy);
    return proxy
}

export function reactive(target){
    return createReactiveObject(target);
}
