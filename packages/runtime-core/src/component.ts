import { reactive } from "@vue/reactivity"
import { hasOwn, isFunction } from "@vue/shared"
export function createComponentInstance(vnode) {
    // 属性分为两种 $attrs(非响应式的) 和 props(响应式的)
    // 所有属性 - propsOptions = $attrs
    // 简单理解起来就是，外面传进来的属性，只要没有用defineProps定义成props或者组件内部自己写props，全都是$attrs
    const instance = {
        data:null, // 状态 state
        vnode, // 组件的虚拟节点
        subTree:null, // 子树
        isMounted:false, // 是否挂载完成
        update:null, // 组件的更新函数
        props:{}, 
        attrs:{}, // 没有$，挂载在instance上的是没有$的，实际this却是有的，原因是因为用了proxy代理映射
        propsOptions:vnode.type.props,
        component:null,
        proxy:null, // 用来代理props，attrs，data让用户方便的访问
    }
    return instance
}

// 初始化属性
const initProps = (instance,rawProps)=>{
    // 根据propsOptions 来区分props和$attrs
    // 元素更新 n2.el = n1.el
    // 组件更新 n2.component.subTree.el = n1.component.subTree.el
    // 再初始化时，这里的props实际上就是外面传入的h函数的第二个参数，包括了props和$attrs
    // 这个函数会把它在instance上分裂
    const props = {}
    const attrs = {}
    const propsOptions = instance.propsOptions || []; // 用户在组件中定义的
    if(rawProps) {
        for(let key in rawProps) { // 用所有的来分裂
            const value = rawProps[key];
            /* 这里缺一步校验 */
            if(key in propsOptions) {
            // props[key] = shallowReactive(value); 
            props[key] = value; 
            } else {
            attrs[key] = value
            }
        }
    }
    instance.props = reactive(props); // props 不需要深度代理，因为组件内部是不能改外部传进来的属性的，但是我没写过shallowReactive
    instance.$attrs = attrs; // 其实吧，虽说$attrs是非响应式的，到那时其实在开发环境下，它是响应式的（为了方便）
}

// proxy 代理的handler
const publicProperty = {
    $attrs:(instance)=>instance.attrs, // 不能写成$attrs:instance.$attrs哦，这样就写死了，还是要根据传入的target返回的
}
const handler = {
    get(target,key) {
        const {data,props} = target;
        // 先看状态再看props
        // 源码好像是先props 再看状态
        if(data && hasOwn(data,key)) {
            return data[key];
        } else if(props && hasOwn(props,key)) { // props
            return props[key];
        } 

        // 对于一些无法修改的属性 $slots、$attrs
        // 在外侧其实this.$attrs.要的属性 也是可以获取的，但不建议，外侧还是 proxy.$attrs.要的属性 好
        const getter = publicProperty[key]; // 通过不同策略访问对应的方法
        if(getter) {
            return getter(target);
        }
    },
    set(target,key,value) {
        const {data,props} = target;
        // 先看状态再看props
        if(data && hasOwn(data,key)) {
            data[key]=value;
        } else if(props && hasOwn(props,key)) { // props
            // 我们用户可以修改属性的嵌套属性，这不合法！
            props[key] =value;
            console.warn('props是只读');
            return false;
        } 
        return true;
    }
}

export function setupComponent(instance) {
    const { vnode } = instance;
    
    // -- 赋值属性 --
    initProps(instance,vnode.props); 
    
    // -- 赋值代理对象 --
    // 实现完成后，组件里的this应该能访问到props，$attrs，组件自己写得data
    instance.proxy = new Proxy(instance,handler)

    console.log(vnode.type);
    
    const {
        data=()=>{},
        render
    } = vnode.type;
    if(!isFunction(data))return console.warn('data必须是函数');

    // data可以拿到props
    instance.data = reactive(data.call(instance.proxy));
    instance.render = render;
}