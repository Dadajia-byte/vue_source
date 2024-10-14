import { ShapeFlags } from "@vue/shared";
import { Fragment, isSameVnode, Text } from "./createVnode";
import { getSequence } from "./seq";
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
    const mountElement =(vnode,container,anchor)=>{
        const {type,children,props,shapeFlag} = vnode;
        // 第一次渲染的时候让虚拟节点和真实dom创建关联
        // 第二次渲染新的vnode，可以和上一次的vnode作对比，之后更新对应的el元素
        let el = (vnode.el= hostCreateElement(type));
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
    const processElement = (n1,n2,container,anchor)=>{
        if(n1===null) {
            mountElement(n2,container,anchor)
        } else {
            patchElement(n1,n2,container);// 非初始化，且复用节点更新
        }
    }
    const processText = (n1,n2,container) =>{
        if(n1===null) {
            // 1. 虚拟节点要关联真实dom
            // 2，将节点插入到页面中
            hostInsert(n2.el=hostCreateText(n2.children,container));
        } else {
            if(n1.children !==n2.children) {
                hostSetText(n2.children)
            }
        }
    }
    const processFragment = (n1,n2,container)=>{
        if(n1===null) {
            mountChildren(n2.children,container);
        } else {
            patchChildren(n1,n2,container);
        }
    }
    const patchProps = (oldProps,newProps,el) => {
        // 新的要全部生效
        for(let key in newProps) {
            hostPatchProp(el,key,oldProps[key],newProps[key])
        }
        for(let key in oldProps) {
            if(!(key in newProps)) { // 以前有现在没有需要删除
                hostPatchProp(el,key,oldProps[key],null)
            }
        }
    }
    const unmountChildren = (children)=>{
        for(let i=0;i<children.length;i++) {
            let child = children[i];
            unmount(child);
        }
    }
    // vue3中 分为两种diff，一种是下面的全量diff(递归)，一种是快速diff(靶向更新)->基于模板跟新
    const patchKeyedChildren = (c1,c2,el)=>{ 
        // 比较两个儿子的差异更新
        // 1. 减少比对范围，先从头开始比，再从尾部开始比 确定不一样的范围
        // 2. 从头比对，再从尾比对，如果有多余的部分
        let i= 0;// 开始比对的索引
        let e1 = c1.length-1;// 第一数组的尾部索引
        let e2 = c2.length-1;// 第二数组的尾部索引
        while(i<=e1&&i<=e2) { // 从头开始比
            // 有任何一方循环结束了，就要终止比较
            const n1 = c1[i];
            const n2 = c2[i];
            if(isSameVnode(n1,n2)) { // 如果当前节点相同
                patch(n1,n2,el); // 更新当前节点的属性和儿子 递归比较子节点
            } else {
                break;
            }
            i++;
        }
        while(i<=e1 && i<=e2) { // 从尾部开始比
            const n1 = c1[e1];
            const n2 = c2[e2];
            if(isSameVnode(n1,n2)) {
                patch(n1,n2,el);
            } else {
                break;
            }
            e1--;
            e2--;
        }
        // 处理增加和删除的特殊情况         
        // a b
        // a b c -> i=2,e1=1,e2=2 i>e1 && i<=e2
        // a b
        // c a b -> i=0,e1=-1,e2=0 i>e1 && i<=e2 新的多老的少
        if(i>e1) { // 新的多
            if(i<=e2) { // 有插入的部分
                let nextPos =e2+1;// 当前下一个元素是否存在
                let anchor = c2[nextPos]?.el;
                while(i<=e2) { // 增加 e1 - e2 之间的所有
                    patch(null,c2[i],el,anchor);
                    i++;
                }
            }
        } else if(i>e2) { // 老的多
            if(i<=e1) {
                while(i<=e1) { // 删除 e2 - e1 之间所有的
                    unmount(c1[i]);
                    i++;
                }
            }
        } else { // 以上确认不变化的节点，并且对插入和删除进行了处理
            // 最终比对乱序的情况
            let s1 = i
            let s2 = i
            const keyToNewIndexMap = new Map();   // 做一个映射表，用于快速查找，看老的是否再新的里面，没有就删除，有的就更新
            let toBePatched = e2 - s2 +1; // 倒序插入的个数  
            let newIndexToOldMapIndex = new Array(toBePatched).fill(0); // 填充
            
            // 根据新的节点找到老节点
            for(let i=s2;i<=e2;i++) {
                const vnode = c2[i];
                keyToNewIndexMap.set(vnode.key,i);
            }
            for(let i=s1;i<=s1;i++) {
                const vnode = c1[i];
                let newIndex = keyToNewIndexMap.get(vnode.key); // 通过key找索引
                if(newIndex===undefined) { // 新的里面找不到老的索引，删除
                    unmount(vnode);
                } else { // 找到了
                    // i可能是0，为了保证0是没有比对过的元素，我们+1
                    newIndexToOldMapIndex[newIndex-s2] = i+1; // 给新节点中曾是老节点同一类型的进行标记，记录下它老的索引值
                    patch(vnode,c2[newIndex],el);
                }
            }
            // 调整顺序
            // 我们可以按照新的队列 倒序插入 往参照物前插入
            
            let increasingSeq = getSequence(newIndexToOldMapIndex);
            let j = increasingSeq.length;// 索引
            for(let i=toBePatched;i>0;i--) {
                let newIndex = s2+i; // 对应的索引，找他下一个元素作为参照物，进行插入
                let anchor = c2[newIndex+1]?.el;
                const vnode = c2[newIndex];
                if(!c2[newIndex].el) { // 说明是新增的元素
                    patch(null,vnode,el,anchor); // 创建插入
                } else {
                    if(i===increasingSeq[j]) {
                        j--; // 做了diff算法的优化
                    } else {
                        hostInsert(vnode,el,anchor); // 接着倒序插入
                    }
                    
                }
            }
        }
    }
    const patchChildren = (n1,n2,el)=>{ // 比较子节点的props进行更新
        // 子节点类型 text null array
        const c1 = n1.children;
        const c2 = n2.children;
        const prevShapeFlag = n1.shapeFlag;
        const shapeFlag = n2.shapeFlag;
        /* 比较情况
            | 新儿子 | 旧儿子 | 操作方式|
            | 文本 | 数组 | 删除老儿子，设置文本内容|
            | 文本 | 文本 | 更新文本即可|
            | 文本 | 空 | 更新文本即可|
            | 数组 | 数组 | diff算法|
            | 数组 | 文本 | 清空文本，进行挂载|
            | 数组 | 空 | 进行挂载|
            | 空 | 数组 | 删除所有儿子|
            | 空 | 文本 | 清空文本|
            | 空 | 空 | 无需处理|
        */
       // 删除相同处理，可总结为以下：
       /*
       1. 新文本，老数组；移除老的
       2. 新文本，老文本；内容不相同替换
       3. 老数组，新数组；全量diff
       4. 老数组，新非数组；移除老节点
       5. 老文本，新为null；
       6. 老文本，新数组；
       */
       if(shapeFlag & ShapeFlags.TEXT_CHILDREN) { // 新文本
        if(prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) { // 新文本，老数组；移除老的
            unmountChildren(c1)
        }
        if(c1!==c2) { // 新文本，老文本；内容不相同替换
            hostSetElementText(el,c2)
        }
       } else { // 新非文本
        if(prevShapeFlag&ShapeFlags.ARRAY_CHILDREN) { 
            if(shapeFlag & ShapeFlags.ARRAY_CHILDREN) { //  老数组，新数组
                // 全量diff算法 两个数组比较
                patchKeyedChildren(c1,c2,el) 
            } else { // 老数组，新非数组；移除老节点
                unmountChildren(c1);
            }
        } else { 
            if(prevShapeFlag&ShapeFlags.TEXT_CHILDREN) { // 老文本，新为null
                hostSetElementText(el,'')
            }
            if(shapeFlag & ShapeFlags.ARRAY_CHILDREN) { // 老文本，新数组
                mountChildren(c2,el)
            }
        }    
       }
    }
    const patchElement = (n1,n2)=>{
        // 1. 比较元素的差异，肯定需要复用dom元素
        // 2. 比较属性和元素的子节点
        let el = n2.el=n1.el; // 对dom元素的复用
        let oldProps = n1.props || {};
        let newProps = n2.props || {};
        // hostPatchProp 只针对一个属性进行处理 class style event attr等
        patchProps(newProps,oldProps,el); // 比完父级比子级，一级一级比较
        patchChildren(n1,n2,el)
    }
    // 渲染走这里，更新也走这里
    const patch = (n1,n2,container,anchor=null)=>{
        if(n1===n2) { // 如果两次渲染同一个节点则跳过
            return;
        }
        if(n1 && !isSameVnode(n1,n2)) { // 判断两个节点是不是同一个
            unmount(n1);
            n1===null;//自动会走后面的逻辑了
        }
        const {type} = n2;
        switch(type) {
            case Text:
                processText(n1,n2,container);
                break;
            case Fragment:
                processFragment(n1,n2,container);
                break;
            default:
                processElement(n1,n2,container,anchor);// 对元素处理，或初始化或复用节点
        }
    }
    const unmount =(vnode)=>{
        if(vnode.type===Fragment) {
            unmountChildren(vnode.children);
            return;
        }
        hostRemove(vnode.el)
    }
    // core中不关心如何渲染
    const render = (vnode,container) =>{
        // 将虚拟节点变成真实节点
        if(vnode===null) { // 如果传入的虚拟节点是null，则需要删除上次挂载这个容器上的虚拟节点（还需要保证这个容器已经挂载过虚拟节点了）
            if(container._vnode) {
                unmount(container._vnode)
            }
        } else {
            // 这里渲染分为第一次渲染和后续渲染（更新），所以需要一个标识位用于保存上次更新的结果，然后再用patch进行更新    
            patch(container._vnode||null,vnode,container);// 如果有_vnode则进行比较再更新
            container._vnode = vnode; // 在挂载的容器上增添一个标识位，用于保存上一次的vnode
        }
        
    }
    return {
        render,
    }
}
// runtime-core完全不关心api层面，不关心如何渲染，只需要传入不同的渲染器就可以渲染不同的结果，同时他携带响应式系统等
// 总而言之，core是一个可以跨平台的模块，它蕴含着任何平台共通的部分，你只需要传入对应的东西，他就能在不同平台使用
// 而runtime-dom作为一个平台适配层，专门用于浏览器环境，它主要承担的责任是浏览器渲染过程（虚拟dom->真实dom）的操作，最后它会接入core实现构建
// 所以，可以说core就是核心，无论在什么环境下都必须要用到core，而dom只是vue提供的官方的渲染器，哪怕处于浏览器环境，我们也可以不使用dom仅仅依靠core但是自己书写渲染器