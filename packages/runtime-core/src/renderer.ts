import { ShapeFlags } from "@vue/shared";
export function createRenderer(renderOptions) {
    const {
        insert:hostInsert,
        remove:hostRemove,
        createElement:hostCreateElement,
        createText:hostCreateText,
        setText:hostSetText,
        setElementText:hostSetElementText,
        parentNode:hostParentNode,
        nextSibling:hostNextSibling,
        patchProp:hostPatchProp,
    } = renderOptions; // 解构渲染DomApi
    const mountChildren =(children,container)=>{
        for(let i=0;i<children.length;i++) {
            // children[i]可能是纯文本元素
            patch(null,children[i],container);
        }
    }
    const mountElement =(vnode,container)=>{
        const {type,children,props,shapeFlag} = vnode;
        let el = hostCreateElement(type);
        if(props) { // 将属性挂载到真实dom上
            for(let key in props) {
                hostPatchProp(el,key,null,props[key])
            }
        }
        // 将vnode身上的shapeFlags和实际的文本节点的shapeFlages进行与运算，如果大于0，则儿子元素肯定是文本节点
        // 原因是位运算的特点，如果做与运算结果大于0，说明A包含B或者B包含A，而shapeFlags本身就是或运算出来的
        if(shapeFlag & ShapeFlags.TEXT_CHILDREN) { // 子元素是文本节点
            hostSetElementText(el,children)
        } else if(shapeFlag & ShapeFlags.ARRAY_CHILDREN) { // 子元素是数组
            mountChildren(el,container);
        }
        hostInsert(el,container);
    }
    // 渲染走这里，更新也走这里
    const patch = (n1,n2,container)=>{

        if(n1===n2) { // 如果两次渲染同一个节点则跳过
            return;
        }
        if(n1===null) { // n1为null则说明是初始化
            mountElement(n2,container)
        }
    }
    // core中不关心如何渲染
    const render = (vnode,container) =>{
        // 将虚拟节点变成真实节点
        // 这里渲染分为第一次渲染和后续渲染（更新），所以需要一个标识位用于保存上次更新的结果，然后再用patch进行更新    
        patch(container._vnode||null,vnode,container);// 如果有_vnode则进行比较再更新
        container._vnode = vnode; // 在挂载的容器上增添一个标识位，用于保存上一次的vnode
    }
    return {
        render,
    }
}

// runtime-core完全不关心api层面，不关心如何渲染，只需要传入不同的渲染器就可以渲染不同的结果，同时他携带响应式系统等
// 总而言之，core是一个可以跨平台的模块，它蕴含着任何平台共通的部分，你只需要传入对应的东西，他就能在不同平台使用
// 而runtime-dom作为一个平台适配层，专门用于浏览器环境，它主要承担的责任是浏览器渲染过程（虚拟dom->真实dom）的操作，最后它会接入core实现构建
// 所以，可以说core就是核心，无论在什么环境下都必须要用到core，而dom只是vue提供的官方的渲染器，哪怕处于浏览器环境，我们也可以不使用dom仅仅依靠core但是自己书写渲染器