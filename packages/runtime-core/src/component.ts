import { proxyRefs } from "@vue/reactivity";
import { reactive } from "@vue/reactivity";
import { hasOwn, isFunction, ShapeFlags } from "@vue/shared";
/**
 * 创建组件实例
 * @param vnode
 * @returns
 * @description 后续很多操作其实都是将vueComponent这个对象上的属性迁移到instance这个组件实例上，我再看这段代码的时候有点疑惑为什么要多此一举呢，直接使用vueComponent不就行了吗，最多对几个属性分分类重命名一下不就行了吗？
 * 原来我忘了状态隔离这个重要的功能，可能有多个地方用到这个组件，肯定对每个组件都要单独new一个实例（虽然这里不是new的形式而是工厂函数）
 */
export function createComponentInstance(vnode, parent) {
  // 属性分为两种 $attrs(非响应式的) 和 props(响应式的)
  // 所有属性 - propsOptions = $attrs
  // 简单理解起来就是，外面传进来的属性，只要没有用defineProps定义成props或者组件内部自己写props，全都是$attrs
  const instance = {
    data: null, // 状态 state
    vnode, // 组件的虚拟节点
    subTree: null, // 子树
    isMounted: false, // 是否挂载完成
    update: null, // 组件的更新函数
    props: {},
    attrs: {}, // 没有$，挂载在instance上的是没有$的，实际this却是有的，原因是因为用了proxy代理映射
    slots: {}, // 插槽，没有$
    propsOptions: vnode.type.props,
    // 这里需要对props有一个明确的区分
    /* 
            这里的vnode是 h(VueComponent,props,children) 创建出来的
            而 vnode.type -> VueComponent -> render()返回产生的vnode -> h(xxx,props)
            这里的propsOptions其实应该是 在VueComponent中声明的一个对象属性
            VueComponent = {
                data:()=>{},
                props:{
                    name:String,
                    age:Number
                },
                render() {
                    return h('div',{},'hello')
                }
            }
            为了方便区分，我们接下来就在注释中以props1作为subTree外侧h函数的props，props2作为subTree内侧的props属性，props3作为render函数中h的props
        */
    proxy: null, // 用来代理props，attrs，data让用户方便的访问
    setupState: {}, // setup返回的状态
    exposed: null, // 暴露给外部的属性
    parent, // 关联的父组件
    // 所有的组件provide都一样 ，parent = {...} , child = 引用对象
    provides: parent ? parent.provides : Object.create(null), // Object.create(null) 为了防止原型链上的属性干扰
    ctx: {} as any, // 如果是keepalive组件，就将dom api放入到这个属性上
  };
  return instance;
}

/**
 * 初始化属性
 * 根据propsOptions 来区分props和$attrs
 * @param instance 创建的组件实例
 * @param rawProps 外部传入的props，即props1
 */
const initProps = (instance, rawProps) => {
  // 元素更新 n2.el = n1.el
  // 组件更新 n2.component.subTree.el = n1.component.subTree.el
  // 这个函数会把它在instance上分裂
  const props = {};
  const attrs = {};
  const propsOptions = instance.propsOptions || {}; // 用户在组件中定义的
  if (rawProps) {
    // 外部传入的所有props1，可能会觉得奇怪谁没事用h函数传入props1，实际上模板语法:name就是这个props1
    for (let key in rawProps) {
      // 用所有的来分裂
      const value = rawProps[key];
      /* 这里缺一步校验 */
      /* --属性校验-- */
      if (key in propsOptions) {
        // props[key] = shallowReactive(value);
        props[key] = value;
      } else {
        attrs[key] = value;
      }
    }
  }
  instance.props = reactive(props); // props 不需要深度代理，因为组件内部是不能改外部传进来的属性的，但是我没写过shallowReactive（悲）
  instance.attrs = attrs; // 其实吧，虽说$attrs是非响应式的，到那时其实在开发环境下，它是响应式的（为了方便）
};
/**
 * @description 初始化插槽
 * @param instance 组件实例
 * @param children vn子元素（组件的children就是插槽）
 */
const initSlots = (instance, children) => {
  if (instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    // 插槽
    instance.slots = children;
  } else {
    instance.slots = {};
  }
};

// $attrs 映射表
const publicProperty = {
  $attrs: (instance) => instance.attrs, // 不能写成$attrs:instance.attrs哦，这样就写死了，还是要根据传入的target返回的
  $slots: (instance) => instance.slots,
};
// proxy 代理的handler
const handler = {
  get(target, key) {
    const { data, props, setupState } = target;
    // 先看状态再看props
    // 源码好像是先props 再看状态
    if (data && hasOwn(data, key)) {
      return data[key];
    } else if (props && hasOwn(props, key)) {
      // props
      return props[key];
    } else if (setupState && hasOwn(setupState, key)) {
      // setupState
      return setupState[key];
    }

    // 对于一些无法修改的属性 $slots、$attrs
    // 在外侧其实this.$attrs.要的属性 也是可以获取的，但不建议，外侧还是 proxy.attrs.要的属性 好
    const getter = publicProperty[key]; // 通过不同策略访问对应的方法
    if (getter) {
      return getter(target);
    }
  },
  set(target, key, value) {
    const { data, props, setupState } = target;
    // 先看状态再看props
    if (data && hasOwn(data, key)) {
      data[key] = value;
    } else if (props && hasOwn(props, key)) {
      // props
      // 我们用户可以修改属性的嵌套属性，但这不合法！
      props[key] = value;
      console.warn("props是只读");
      return false;
    } else if (setupState && hasOwn(setupState, key)) {
      setupState[key] = value;
    }
    return true;
  },
};

/**
 * @description 初始化组件
 * @param instance 组件实例
 */
export function setupComponent(instance) {
  const { vnode } = instance;

  // -- 赋值属性 --
  initProps(instance, vnode.props);

  // -- 赋值插槽 --
  initSlots(instance, vnode.children);

  // -- 赋值代理对象 --
  // render(proxy)里的proxy就指向instance
  instance.proxy = new Proxy(instance, handler);

  const { data = () => {}, render, setup } = vnode.type;

  if (setup) {
    // 如果写了setup函数
    const setupContext = {
      // setup的上下文 里面有attrs,slots,expose,emit
      attrs: instance.attrs,
      slots: instance.slots,
      expose: (value) => {
        instance.exposed = value;
      },
      emit(event, ...payload) {
        const eventName = `on${event[0].toUpperCase() + event.slice(1)}`;
        const handler = instance.vnode.props[eventName];
        handler && handler(...payload);
      },
    };
    setCurrentInstance(instance); // 设置当前全局实例，便于setup函数执行时获取当前实例（生命周期）
    const setupRes = setup(instance.props, setupContext); // setup函数的返回值相当于一个render函数
    unsetCurrentInstance();
    if (isFunction(setupRes)) {
      // 如果返回的是函数，那么就是render函数
      instance.render = setupRes;
    } else {
      // 如果返回的是对象，那么就是setupState
      instance.setupState = proxyRefs(setupRes || {}); // 将返回的值做ref
    }
  }

  if (!isFunction(data)) {
    console.warn("data必须是函数");
  } else {
    // data可以拿到props
    instance.data = reactive(data.call(instance.proxy));
  }
  // setup优先级要高于render
  if (!instance.render) {
    instance.render = render;
  }
}

export let currentInstance = null;
export const getCurrentInstance = () => {
  return currentInstance;
};

export const setCurrentInstance = (instance) => {
  currentInstance = instance;
};

export const unsetCurrentInstance = () => {
  currentInstance = null;
};
