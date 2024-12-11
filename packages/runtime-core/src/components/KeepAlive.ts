import { ShapeFlags } from "@vue/shared";
import { onMounted, onUpdated } from "../apiLifecycle";
import { getCurrentInstance } from "../component";

export const KeepAlive = {
    __isKeepAlive: true,
  setup(props,{slots}) {
    const keys = new Set(); // 用来记录哪些组件缓存过
    const cache = new Map(); // 缓存表 <keep-alive key="xxx"></keep-alive>
    // 在这个组件中需要一些dom方法，可以将元素移动到一个div中
    // 还要能卸载某个元素

    let pendingCacheKey = null; // 等待缓存的key
    const instance = getCurrentInstance();
    const cacheSubTree = () => {
      cache.set(pendingCacheKey, instance.subTree); // 缓存组件的虚拟节点，里面有组件的dom
    }

    // 这里是keepalive特有的初始化方法
    // 激活时执行
    const {move,createElement} = instance.ctx.renderer;
    instance.ctx.activate = (vnode,container,anchor)=>{
      move(vnode,container,anchor);
    }
    // 失活时执行
    const storageContent = createElement('div');
    instance.ctx.deactivate = (vnode)=>{
      move(vnode,storageContent,null); // 将dom元素临时移动到这个div中，但是没有被销毁
    }



    onMounted(cacheSubTree);
    onUpdated(cacheSubTree);

    return () => {
      // process
      const vnode = slots.default();
      const component = vnode.type;
      const key = vnode.key == null ? component : vnode.key;
      const cacheVNode = cache.get(key);
      pendingCacheKey = key;
      if (cacheVNode) {
        vnode.component = cacheVNode.component; // 不用重新创建组件实例，直接复用即可
        vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE; // 标记这个组件是keep-alive的, 不需要初始化了
      } else {
        keys.add(key)
      }
      vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE; // 这个组件不需要真的卸载
      return vnode; // 等待组件加载完毕后再去缓存
    }
  }

}

export const isKeepAlive = (val) => val.type.__isKeepAlive;