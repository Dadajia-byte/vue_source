import { isObject } from "@vue/shared";
import { createVnode,isVnode } from "./createVnode";

/**
 * 
 * @param type 同createVnode一致，字符串或者Symbol
 * @param propsOrChildren 可选，可能是props或者children；
 * @param children 可选 若存在一定是children
 * @returns 
 * @description 重写createVnode，让参数更多样性
    h函数的参数有很多种：
    1. 1个 类型
    2. 2个 类型+props/childrens
    3. 3个 类型+props+childrens
    4. 3个以上 类型+props+children+children+...都是children

    // 思路：
    1. 两个参数 第二个参数可能是属性或者虚拟节点（__v_isVnode）
    2. 第二个参数就是数组 -> 儿子
    3. 其他情况就是属性
    4. 直接传递非对象 -> 文本
    5. 不能出现三个参数时，第二个参数不是属性
    6. 如果出现三个参数，后面都是儿子
 */
export function h(type,propsOrChildren?,children?) {
    let l = arguments.length;// 参数长度
    if(l === 2) {
        if(isObject(propsOrChildren)&&!Array.isArray(propsOrChildren)) { // 属性或者vn
            if(isVnode(propsOrChildren)) { // 如果第二参数是vnode（不包含vnode数组情况，所以要用数组框起来），说明属性为空
                return createVnode(type,null,[propsOrChildren])
            } else { // 第二参数是属性
            
                return createVnode(type,propsOrChildren);
            }
        }
        // 第二个参数是vn数组或者文本
        return createVnode(type,null,propsOrChildren);
    } else {
        if (l>3) {
            children = Array.from(arguments).slice(2); // 之后的全部变成数组
        } else if(l===3 && isVnode(children)) { // 三个了必须考虑children究竟是vn数组还是vn，还是文本，文本不管他，如果是vn必须变成vn数组
            children = [children];
        }
        return createVnode(type,propsOrChildren,children);
    }
}

