import { isObject, isString, ShapeFlags, isFunction } from "@vue/shared";
import { isTeleport } from "./components/Teleport";
// 虽然标准但是这里的children仍可能是文本，vn数组（就算只有一个vn也必须变成数组），所以需要做判断
export const Text = Symbol("Text");
export const Fragment = Symbol("Fragment");
/**
 * @param value
 * @returns Boolean
 * @description 判断是否是虚拟节点，通过判断传入对象是否有__v_isVnode属性
 */
export function isVnode(value) {
  return value?.__v_isVnode;
}
/**
 * @param n1 节点一
 * @param n2 节点二
 * @returns Boolean
 * @description 判断两个虚拟节点是否相同，如果虚拟节点的type和key都相同则认为是相同的虚拟节点
 */
export function isSameVnode(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key; // 主要判断两者的type是否一致,除此之外就是key的判断
}
/**
 * @param type 传入的类型 可能是一个字符串（代表原生标签），也可能是一个Symbol（例如Fragment、Text）
 * @param props 其他参数（例如class，style等）
 * @param children 子元素（可能是一个数组也可能是一个文本）
 * @description 标准的虚拟dom创建方法，h方法其实是基于createVnode重写的，就是因为重写才导致h方法的写法多种多样，但终归是调用createVnode，它的调用就是h方法的标准写法，因此它的参数也比较固定和单一
 * @returns
 */
export function createVnode(type, props, children?, patchFlag?) {
  // 绝对标准的h方法，所以不用对他的参数进行多种多样的考虑，仅有一种可能
  /*判断type类型*/
  const shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT /*元素*/
    : isTeleport(type)
    ? ShapeFlags.TELEPORT /*Teleport*/
    : isObject(type)
    ? ShapeFlags.STATEFUL_COMPONENT /*有状态组件*/
    : isFunction(type)
    ? ShapeFlags.FUNCTIONAL_COMPONENT /*函数式组件*/
    : 0; /* 文本节点 */
  const vnode = {
    __v_isVnode: true, // 标识该对象是虚拟节点
    type,
    props,
    children,
    key: props?.key, // diff算法后面需要的key
    el: null, // 虚拟节点需要对应的真实节点是谁
    shapeFlag, // children的内容代表着节点的类型
    ref: props?.ref,
    patchFlag,
  };
  if (currentBlock && patchFlag > 0) {
    // 如果有block并且patchFlag有patchFlag，说明是动态节点，推入block中
    currentBlock.push(vnode);
  }
  if (children) {
    if (Array.isArray(children)) {
      vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
    } else if (isObject(children)) {
      // 第三个参数是对象说明是插槽
      vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN;
    } else {
      children = String(children);
      vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN;
    }
  }
  return vnode;
}

let currentBlock = null;
const blockStack = [];
export function openBlock() {
  // 用于收集动态节点
  blockStack.push((currentBlock = []));
}

export function closeBlock() {
  currentBlock = blockStack.pop() || null;
}
export function setupBlock(vnode) {
  vnode.dynamicChildren = currentBlock; // 当前elementBlock会收集子节点，用当前的block收集
  closeBlock();
  return vnode;
}

// 其实就是createVnode的封装，只是多了一个收集虚拟节点的功能
export function createElementBlock(type, props, children, patchFlag?) {
  return setupBlock(createVnode(type, props, children, patchFlag));
}

export function toDisplayString(value) {
  return isString(value)
    ? value
    : value === null
    ? ""
    : isObject(value)
    ? JSON.stringify(value)
    : String(value);
}

export { createVnode as createElementVNode };
