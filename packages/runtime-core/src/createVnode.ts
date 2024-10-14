import {  isString, ShapeFlags } from "@vue/shared";

// 标准的虚拟dom创建方法，h方法其实是基于createVnode重写的，就是因为重写才导致h方法的写法多种多样，但终归是调用createVnode，它的调用就是h方法的标准写法
// 虽然标准但是这里的children仍可能是文本，vn数组（就算只有一个vn也必须变成数组），所以需要做判断
export const Text = Symbol('Text');
export const Fragment = Symbol('Fragment');
export function isVnode(value) {
    return value?.__v_isVnode;
}
export function isSameVnode(n1,n2) {
    return n1.type === n2.type && n1.key === n2.key // 主要判断两者的type是否一致,除此之外就是key的判断
}
export function createVnode(type,props,children?) { // 绝对标准的h方法，所以不用对他的参数进行多种多样的考虑，仅有一种可能
    const shapeFlag = isString(type) ?ShapeFlags.ELEMENT:0; // 判断type类型
    const vnode = {
        __v_isVnode:true,// 标识该对象是虚拟节点
        type,
        props,
        children,
        key:props?.key, // diff算法后面需要的key
        el:null,// 虚拟节点需要对应的真实节点是谁
        shapeFlag, // 这玩意儿是父与子元素的shapeFlag之和，代表着虚拟节点的类型
    }
    if(children) {
        if(Array.isArray(children)) {
            vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
        } else {
            children = String(children);
            vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN;
        }
    }
    return vnode;
    
}