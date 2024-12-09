import { isObject } from "@vue/shared";
import { mutableHandlers } from "./baseHandler";
import { ReactiveFlags } from "./constants";
// 用于记录我们的 代理后的结果可以复用
const reactiveMap = new WeakMap();

function createReactiveObject(target: any) {
  // 统一做判断，响应式对象必须是对象才行
  if (!isObject(target)) {
    return target;
  }
  if (target[ReactiveFlags.IS_REACTIVE]) {
    // 保证无法被重复代理
    return target;
  }
  // 取缓存，如果有直接返回
  const existProxy = reactiveMap.get(target);
  if (existProxy) {
    return existProxy;
  }
  let proxy = new Proxy(target, mutableHandlers);
  // 根据对象缓存代理后的结果
  reactiveMap.set(target, proxy);
  return proxy;
}

export function reactive(target: any) {
  return createReactiveObject(target);
}

export function toReactive(value) {
  // 如果传入的值是对象，就返回代理后的对象，否则就返回本身
  return isObject(value) ? reactive(value) : value;
}

export function isReactive(value) {
  return !!(value && value[ReactiveFlags.IS_REACTIVE]);
}
