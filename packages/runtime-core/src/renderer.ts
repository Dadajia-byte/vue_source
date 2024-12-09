import {  ShapeFlags } from "@vue/shared";
import { createVnode, Fragment, isSameVnode, Text } from "./createVnode";
import { getSequence } from "./seq";
import { createComponentInstance,setupComponent } from "./component";

/* 
    组件更新有三种方式：
    1. 状态 自身的state（data），构建effect，通过updateComponent
    2. 属性 传入的props
    3. 插槽 也是属性 childrens
*/

/** 
 * @param renderOptions 
 * @returns 
 * @description 创建渲染器，渲染器是一个对象，包含一个render方法，用于渲染虚拟节点
 */
import {isRef, ReactiveEffect} from "@vue/reactivity";
import { queueJob } from "./sheduler";
import { invokeArrayFns } from "./apiLifecycle";
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
    } = renderOptions; // 解构渲染DomAPI
    const normalize = (children)=>{
        for(let i = 0;i<children.length;i++) {
            if(typeof children[i]==='string' || typeof children[i] === 'number') { // 儿子是文本数组，可以实现简写
                children[i]= createVnode(Text,null,String(children[i]));
            }
        }
        return children;
    }

    /**
     * 用于挂载子元素
     * @param children 虚拟节点的childrens
     * @param container 虚拟节点挂载的容器，这里也可见虚拟节点的container都是它的顶层（我一开始还以为是父节点哪里刚create的呢）
     */
    const mountChildren =(children,container,parentComponent)=>{
        normalize(children);
        for(let i=0;i<children.length;i++) { // 我有时会想一个问题，类似可能这种跟顺序没关系的for使用while递减如何呢？或者干脆使用forEach，map等方法如何呢？
            // children[i]可能是纯文本元素
            patch(null,children[i],container,parentComponent); // 啥都别说了，父节点都是初始化挂载，子节点当然也是继续挂载而不是更新，所以n1都是null
        }
    }
    /**
     * 挂载操作，子元素也全都是挂载初始化.
     * 由于传入processElement的n1为空或者n1和n2不是同一个节点，所以这里需要挂载新的节点，即初始化操作
     * @param vnode n2即本次需要处理的虚拟节点
     * @param container 本次被挂载的容器
     * @param anchor 锚点，在全量diff中目前似乎没有用处
     */
    const mountElement =(vnode,container,anchor,parentComponent)=>{
        const {type,children,props,shapeFlag} = vnode; // 解构虚拟节点，并依次处理对应的属性
        // 第一次渲染的时候让虚拟节点和真实dom创建关联
        // 第二次渲染新的vnode，可以和上一次的vnode作对比，之后更新对应的el元素

        // ---创建真实dom---
        let el = (vnode.el= hostCreateElement(type));

        // ---处理属性(props)---
        if(props) { // 将属性挂载到真实dom上
            for(let key in props) {
                hostPatchProp(el,key,null,props[key])
            }
        }

        // --处理子元素(childrens)--
        // 将vnode身上的shapeFlags和实际的文本节点的shapeFlages进行与运算，如果大于0，则儿子元素肯定是文本节点
        // 原因是位运算的特点，如果做与运算结果大于0，说明A包含B或者B包含A，而shapeFlags本身就是或运算出来的
        if(shapeFlag & ShapeFlags.TEXT_CHILDREN) { // 子元素是文本节点
            hostSetElementText(el,children) // 设置文本，你可以简单理解为给el这个dom的innnerText赋值
        } else if(shapeFlag & ShapeFlags.ARRAY_CHILDREN) { // 子元素是数组，既然子元素是数组（虚拟节点数组），当然要继续处理下去喽，当然使用patch就行了，但是这里单独多拉出来一个方法，是为了更好的逻辑分离
            mountChildren(children,el,parentComponent); // 递归挂载子元素
        }
        hostInsert(el,container);
    }
    /**
     * 针对普通元素进行更新或初始化
     * @param n1 容器上挂载的vnode，用于判断是否是初始化（如果null则代表初始化）
     * @param n2 本次需要挂载或者更新的虚拟节点
     * @param container 本次被挂载的容器
     * @param anchor 锚点，用于diff算法插入的位置
     */
    const processElement = (n1,n2,container,anchor,parentComponent)=>{
        if(n1===null) { // 初始化(或者n1和n2不是一个节点强制初始化)
            mountElement(n2,container,anchor,parentComponent) // 挂载元素
        } else {
            patchElement(n1,n2,container,parentComponent);// 非初始化，且复用节点更新
        }
    }
    const processText = (n1,n2,container) =>{
        if(n1===null) {
            // 1. 虚拟节点要关联真实dom
            // 2，将节点插入到页面中
         
            hostInsert(n2.el=hostCreateText(n2.children),container);
        } else {
            debugger;
            if(n1.children !==n2.children) {   
                hostSetText(n2.el=n1.el,n2.children); // 复用n1的el，并更新文本
            }
        }
    }

    const processFragment = (n1,n2,container,parentComponent)=>{
        if(n1===null) {   
            mountChildren(n2.children,container,parentComponent);
        } else {
            patchChildren(n1,n2,container,parentComponent);
        }
    }
    /**
     * 
     * @param oldProps n1的props即老属性
     * @param newProps n2的props即新属性
     * @param el 传入的dom，即n1.el和n2.el，它俩被链接了其实是一个
     */
    const patchProps = (oldProps,newProps,el) => {
        // 新的要全部生效
        for(let key in newProps) {
            hostPatchProp(el,key,oldProps[key],newProps[key])
        }
        // 老的有新的没有，需要删除
        for(let key in oldProps) {
            if(!(key in newProps)) {
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
    
    /**
     * 全量diff更新，仅限两个儿子都是数组的情况
     * @param c1 
     * @param c2 
     * @param el 
     * @description vue3中 分为两种diff，一种是下面的全量diff(递归)，一种是快速diff(靶向更新)->基于模板跟新
     */
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
    /**
     * 子节点比较更新
     * @param n1 老虚拟节点
     * @param n2 新虚拟节点
     * @param el dom
     */
    const patchChildren = (n1,n2,el,parentComponent)=>{ // 比较子节点的props进行更新
        // 子节点类型 text null array
        const c1 = n1.children;
        const c2 = normalize(n2.children);
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
        if(prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) { 
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
                mountChildren(c2,el,parentComponent)
            }
        }    
       }
    }
    /**
     * 更新操作，diff算法就是在这里处理的，必须满足n1不为null(非初始化挂载且n1和n2是一个节点（type和key相同）)
     * @param n1 上一次挂载的虚拟节点
     * @param n2 此次挂载的虚拟节点
     * @description 依次对 dom、props、children 进行比较更新。
     */
    const patchElement = (n1,n2,parentComponent)=>{
        // 1. 比较元素的差异，肯定需要复用dom元素
        // 2. 比较属性和元素的子节点
        let el =n2.el=n1.el; // 对dom元素的复用，创建引用连接，确保el修改后会对n2，n1产生影响
        let oldProps = n1.props || {};
        let newProps = n2.props || {};

        // --- props比较 ---
        // hostPatchProp 只针对一个属性进行处理 class style event attr等
        patchProps(newProps,oldProps,el); // 比完父级比子级，一级一级比较

        // --- children比较 ---
        patchChildren(n1,n2,el,parentComponent)
    }
    const updateComponentPreRender = (instance,next)=>{ 
        // 更新属性和插槽
        instance.next = null; // 清空next
        instance.vnode = next; 
        updateProps(instance,instance.props,next.props); // 更新属性
    }
    function renderComponent(instance) {
        const {render,vnode,proxy,props,attrs} = instance;
        if(vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) { // 有状态组件
            return render.call(proxy,proxy);
        } else { // 函数式组件
            return vnode.type(attrs)
        }
    }

    function setupRenderEffect(instance,container,anchor) {
        const componentUpdate = ()=>{ // 更新函数
            // 我们要区分是第一次还是之后的更新，不然会一直叠在上面一直挂载
            const {bm,m,bu,u} = instance; // 拿到生命周期钩子
            if (!instance.isMounted) { // 未被挂载过（第一次）
                if(bm) { // 挂载前
                    invokeArrayFns(bm);
                }
                
                const subTree = renderComponent(instance); // 生成subTree，由于内部使用了this，这里的this不能指向组件（考虑状态共享问题），必须指向组件实例，但是同时也不能直接指向组件实例，要指向组件实例上的proxy
                patch(null,subTree,container,anchor,instance); // 向下走一层，实现对subTree的初次挂载
                instance.isMounted = true;
                instance.subTree = subTree;

                if(m) { // 挂载后
                    invokeArrayFns(m);
                }
            } else {
                const {next } = instance;
                if(next) { // 分开两边写更新实在太变态，这里通过next来判断是否为属性或插槽更新
                    // 更新属性和插槽
                    updateComponentPreRender(instance,next);
                }

                if(bu) {
                    invokeArrayFns(bu);
                }
                // 基于状态的组件更新
                const subTree = renderComponent(instance);
                patch(instance.subTree,subTree,container,anchor,instance); // 上一次的subTree和此次进行更新
                instance.subTree = subTree;

                if(u) {
                    invokeArrayFns(u);
                }
            }
        }
        // 这里不直接使用update作为scheduler，而是再包装实现批处理
        // 如果不想做批处理直接使用watchEffect，那么每次更新都会执行scheduler，这样每次更新都会执行一次effect，导致每次更新都执行一次render，导致性能问题
        const effect=new ReactiveEffect(componentUpdate,()=>
            queueJob(update)
        ); 
        const update = (instance.update=()=>effect.run());
        update();
    }
    /**
     * 挂载组件，主要分为三个步骤
     * 1. 创建组件实例
     * 2. 给实例属性赋值
     * 3. 创建一个effect
     * @param n2 提供的组件vnode
     * @param container 挂载的容器
     * @param anchor 锚点
     */
    const mountComponent = (n2,container,anchor,parentComponent)=>{
        // 1. 先创建组件实例
        const instance = (n2.component = createComponentInstance(
            n2,
            parentComponent
        ));
        
        // 2. 给实例属性/插槽等赋值
        setupComponent(instance);

        // 3. 创建一个effect
        setupRenderEffect(instance,container,anchor,parentComponent);
    }
    const hasPropsChange = (preProps,newProps)=>{
        debugger;
        // 这里prop其实是 名：类型 键值对
        let nKeys = Object.keys(newProps);
        if(nKeys.length!==Object.keys(preProps).length) {
            return true
        } 
        for(let i=0;i<nKeys.length;i++) {
            let key = nKeys[i];
            if(newProps[key]!==preProps[key]) {
                return true
            }
        }
        return false;
    }
    // 插槽更新可能也用到，所以抽离出来
    const updateProps = (instance,preProps,newProps) => {
        debugger;
        if(hasPropsChange(preProps,newProps)) {
            for(let key in newProps) { // 遍历新属性，如果新属性有，就赋值，没有就删除
                instance.props[key] = newProps[key];
            };
            for(let key in instance.props) {
                if(!(key in newProps)) {
                    delete instance.props[key];
                }
            }
        }
    }
    const shouldComponentUpdate = (n1,n2)=>{
        debugger;
        const {props:preProps,children:prevChildren} = n1;
        const {props:newProps,children:nextChildren} = n2;
        if (prevChildren || nextChildren) return true; // 如果有插槽，直接走更新渲染即可
        if(preProps === newProps) return false; // 如果属性一样，不需要更新
        // 如果属性不一样，需要更新
        return hasPropsChange(preProps,newProps); // 如果属性不一样，需要更新
    }
    const updateComponent = (n1,n2)=>{
        const instance = (n2.component = n1.component); // 复用组件的实例; 再次声明，组件的复用是component，元素的复用是el
        // 让更新逻辑统一
        if(shouldComponentUpdate(n1,n2)) {
            debugger;
            instance.next = n2; // 如果调用update 有next属性，说明是属性或插槽更新
            instance.update();
        }
    }
    /**
     * 处理状态组件
     * @param n1 上一次的节点
     * @param n2 此次节点
     * // 如果是状态组件的话，那么这里的n2不应该是跟正常标签一样的vnode，而是一个多包了一层的vnode
     * n2 = {
     *          type: {  // --> 一个内含render方法的对象VueComponent，就是书写的组件，实际上模板语法template会被编译成这样的对象
     *              render() --> 返回vnode --> 即subTree
     *          }, 
     *          props:{},
     *          xxx
     *       } --> vnode
     * @param container 挂载容器
     * @param anchor 锚点
     */
    const processComponent = (n1,n2,container,anchor,parentComponent)=>{
        if(n1===null) {
            mountComponent(n2,container,anchor,parentComponent);
        } else {
            // 这里比较props的变化，实现响应式（n1和n2的变化追踪）
            updateComponent(n1,n2,parentComponent); // 不能使用patch，因为会死循环
        }
    }

    /**
     * 渲染走这里，更新也走这里
     * @param n1 容器上（container）的_vnode，即上次渲染中_vnode，这个值可能为null，代表是初次渲染
     * @param n2 本次传入的vnode，如果是初次渲染则正常渲染，如果n1有值，那么n2将会和n1进行diff比较更新
     * @param container 挂载的容器
     * @param anchor 锚点默认为null
     * @returns 
     */
    const patch = (n1,n2,container,anchor=null,parentComponent = null)=>{
        if(n1===n2) { // 如果两次渲染同一个节点则跳过
            return;
        };
        if(n1 && !isSameVnode(n1,n2)) { // 判断两个节点是不是同一个
            // 如果是更新操作（n1!==null），且两个节点不一样，则直接进行全量替换（不进行diff）
            unmount(n1); // 卸载n1
            n1=null;//自动会走后面的逻辑了，变成初次渲染了
        };
        const {type, ref, shapeFlag} = n2; // 获取节点类型，针对不同类型进行不同处理
        switch(type) {
            case Text: // Text节点
                processText(n1,n2,container); // 处理文本
                break;
            case Fragment: // Fragment节点
                processFragment(n1,n2,container,parentComponent); // 处理Fragment
                break;
            default:
                if (shapeFlag & ShapeFlags.ELEMENT) { // 对元素处理，或初始化或复用节点
                 processElement(n1,n2,container,anchor,parentComponent);
                } else if (shapeFlag & ShapeFlags.TELEPORT) { // Teleport节点
                    type.process(n1,n2,container,anchor,parentComponent, {
                        mountChildren,
                        patchChildren,
                        // 此方法可以将组件或者dom移动到指定位置
                        move(vnode,container,anchor) {
                            hostInsert(vnode.component?vnode.component.subTree.el:vnode.el,container,anchor)
                        }
                    });
                } else if (shapeFlag & ShapeFlags.COMPONENT) { // 组件的处理(包含了状态组件和函数组件)
                    // 对组件的处理，需要注意的是vue3中的函数式组件已经弃用了，因为不节约性能
                    processComponent(n1,n2,container,anchor,parentComponent);
                } 
        }
        if(ref!==null) {
            // n2 是dom元素还是组件，还是组件有expose
            setRef(ref, n2)
        }
    }
    // 1. 内部 如果ref放到组件上，值得是组件的实例，如果当前组件有expose，值得是expose
    // 2. 如果放到dom元素上，值得是dom元素
    function setRef(rawRef,vnode) {
        let value =  vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT ? 
            vnode.component.exposed || vnode.component.proxy 
            : vnode.el;
        if(isRef(rawRef)) {
            rawRef.value = value;
        }
    }
    /**
     * 用于卸载挂在真实dom上的节点
     * @param vnode 传入的虚拟节点，它是来自它挂载的容器（container）身上的_vnode属性
     * @returns 
     */
    const unmount =(vnode)=> {
        const {shapeFlag} = vnode;
        if(vnode.type===Fragment) {
            unmountChildren(vnode.children);
        } else if(shapeFlag & ShapeFlags.COMPONENT) {
            // 卸载组件
            unmount(vnode.component.subTree);
        } else if(shapeFlag & ShapeFlags.TELEPORT) {
            vnode.type.remove(vnode,unmountChildren);
        } else {
            hostRemove(vnode.el);
        } 
    }
    // core中不关心如何渲染
    /**
     * 生成的渲染器
     * @param vnode 传入的虚拟节点
     * @param container 传入的容器（虚拟节点需要挂在的真实dom），他身上在经历render之后会有一个_vnode属性，用于保存上一次的vnode，同时也用于标识这个dom曾经被挂载过虚拟节点
     */
    const render = (vnode,container) => {
        // 将虚拟节点变成真实节点
        if(vnode===null) { // 如果传入的虚拟节点是null，则需要删除上次挂载这个容器上的虚拟节点（还需要保证这个容器已经挂载过虚拟节点了）
            if(container._vnode) {
                unmount(container._vnode)
            }
        } else {
            // 这里渲染分为第一次渲染和后续渲染（更新），所以需要一个标识位用于保存上次更新的结果，然后再用patch进行更新  
            patch(container?._vnode||null,vnode,container);// 如果有_vnode则进行比较再更新
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